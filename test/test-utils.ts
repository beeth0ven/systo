import { isDeepStrictEqual } from 'node:util';
import { expect, vi } from 'vitest';
import { Observer, Store, System } from '../src/core.js';

type Input<Event, SourceState> =
  | ['observe']
  | ['observe2']
  | ['dispatch', Event | readonly Event[]]
  | ['dispatch2', Event | readonly Event[]]
  | ['dispose']
  | ['dispose2']
  | ['source.next', SourceState]
  | ['source.next2', SourceState];

type Output<State, SourceEvent> =
  | ['next', State]
  | ['next2', State]
  | ['source.observe']
  | ['source.observe2']
  | ['source.dispatch', SourceEvent | readonly SourceEvent[]]
  | ['source.dispatch2', SourceEvent | readonly SourceEvent[]]
  | ['source.dispose']
  | ['source.dispose2']
  | ['log', string];

type TestEvent<State, Event, SourceState, SourceEvent> = 
  | Input<Event, SourceState>
  | Output<State, SourceEvent>;

type TimedInput<Event, SourceState> = [number, ...Input<Event, SourceState>];
type TimedOutput<State, SourceEvent> = [number, ...Output<State, SourceEvent>];

interface SourceDispatchInput<SourceState, SourceEvent> {
  time: number;
  target: 1 | 2;
  event: SourceEvent | readonly SourceEvent[];
  emission?: { sourceState: SourceState };
  consumed: boolean;
}

type TimedTestEvents<State, Event, SourceState, SourceEvent> = Record<number, TestEvent<State, Event, SourceState, SourceEvent>[]>;

const INPUT_TYPES: Set<string> = new Set<Input<unknown, unknown>[0]>([
  'observe',
  'observe2',
  'dispatch',
  'dispatch2',
  'dispose',
  'dispose2',
  'source.next',
  'source.next2',
]);

function isInput<State, Event, SourceState, SourceEvent>(
  testEvent: TestEvent<State, Event, SourceState, SourceEvent>,
): testEvent is Input<Event, SourceState> {
  return INPUT_TYPES.has(testEvent[0]);
}

interface SystemTestConfig<State, Event, SourceState, SourceEvent> {
  systemFactory: (
    mockSource: System<SourceState, SourceEvent>,
    log: (message: string) => void,
  ) => System<State, Event>;
  events: TimedTestEvents<State, Event, SourceState, SourceEvent>;
}

async function runSystemTest<State, Event, SourceState, SourceEvent>(
  config: SystemTestConfig<State, Event, SourceState, SourceEvent>,
): Promise<void> {
  vi.useFakeTimers();
  const tester = new Tester(config);
  try {
    tester.schedule();
    const maxTime = Math.max(0, ...Object.keys(config.events).map(Number));
    await vi.advanceTimersByTimeAsync(maxTime + 990); // for delay operator like `StateDelay`.`
    expect(tester.outputs).toEqual(tester.expectedOutputs);
  } finally {
    vi.useRealTimers();
  }
}

class Tester<State, Event, SourceState, SourceEvent> {
  public readonly mainInputs: TimedInput<Event, SourceState>[] = [];
  public readonly sourceDispatchInputs: SourceDispatchInput<SourceState, SourceEvent>[] = [];
  public readonly expectedOutputs: TimedOutput<State, SourceEvent>[] = [];
  public readonly outputs: TimedOutput<State, SourceEvent>[] = [];
  private readonly startTime = Date.now();
  private store?: Store<State, Event>;
  private store2?: Store<State, Event>;
  private sourceNext?: (value: SourceState) => void;
  private sourceNext2?: (value: SourceState) => void;

  private readonly observer: Observer<State> = {
    next: (state) => this.record(['next', state]),
  };

  private readonly observer2: Observer<State> = {
    next: (state) => this.record(['next2', state]),
  };

  constructor(private readonly config: SystemTestConfig<State, Event, SourceState, SourceEvent>) {
    for (const [timeKey, events] of Object.entries(config.events)) {
      const time = Number(timeKey);
      let sourceDispatchInput: SourceDispatchInput<SourceState, SourceEvent> | null = null;
      for (const event of events) {
        if (isInput(event)) {
          const isDispatchEmission = sourceDispatchInput !== null
            && (sourceDispatchInput.target === 2 ? 'source.next2' : 'source.next') === event[0];
          if (isDispatchEmission) {
            sourceDispatchInput!.emission = { sourceState: event[1] };
          } else {
            this.mainInputs.push([time, ...event]);
          }
          sourceDispatchInput = null;
        } else {
          this.expectedOutputs.push([time, ...event]);
          if (event[0] === 'source.dispatch' || event[0] === 'source.dispatch2') {
            sourceDispatchInput = {
              time,
              target: event[0] === 'source.dispatch' ? 1 : 2,
              event: event[1],
              consumed: false,
            };
            this.sourceDispatchInputs.push(sourceDispatchInput);
          }
        }
      }
    }
  }

  private _system?: System<State, Event>;
  private get system(): System<State, Event> {
    if (!this._system) {
      const mockSource: System<SourceState, SourceEvent> = {
        observe: (observer: Observer<SourceState>) => {
          const isFirst = !this.sourceNext;
          const sourceNext = (value: SourceState) => {
            observer.next(value);
          };
          if (isFirst) {
            this.sourceNext = sourceNext;
            this.record(['source.observe']);
          } else if (!this.sourceNext2) {
            this.sourceNext2 = sourceNext;
            this.record(['source.observe2']);
          } else {
            throw new Error(`Tester only supports up to 2 source connections.`);
          }
          return {
            dispatch: (event: SourceEvent | readonly SourceEvent[]) => {
              this.record([isFirst ? 'source.dispatch' : 'source.dispatch2', event]);
              const input = this.sourceDispatchInputs
                .find((input) => !input.consumed
                  && input.time === this.time 
                  && input.target === (isFirst ? 1 : 2)
                  && isDeepStrictEqual(input.event, event)
                );
              if (input) {
                input.consumed = true;
                if (input.emission) {
                  sourceNext(input.emission.sourceState);
                }
              }
            },
            dispose: () => {
              this.record([isFirst ? 'source.dispose' : 'source.dispose2']);
            },
          };
        },
      };
      const log = (message: string) => this.record(['log', message]);
      this._system = this.config.systemFactory(mockSource, log);
    }
    return this._system;
  }

  private get time(): number {
    return Date.now() - this.startTime;
  }

  private record(output: Output<State, SourceEvent>) {
    this.outputs.push([this.time, ...output]);
  }

  schedule() {
    this.mainInputs.forEach(([time, ...input]) => {
      setTimeout(() => {
        switch (input[0]) {
          case 'observe':
            this.store = this.system.observe(this.observer);
            break;
          case 'dispatch':
            this.store?.dispatch(input[1]);
            break;
          case 'dispose':
            this.store?.dispose();
            break;
          case 'observe2':
            this.store2 = this.system.observe(this.observer2);
            break;
          case 'dispatch2':
            this.store2?.dispatch(input[1]);
            break;
          case 'dispose2':
            this.store2?.dispose();
            break;
          case 'source.next':
            this.sourceNext?.(input[1]);
            break;
          case 'source.next2':
            this.sourceNext2?.(input[1]);
            break;
        }
      }, time);
    });
  }
}

export { 
  Input, 
  Output, 
  TimedInput, 
  TimedOutput, 
  SourceDispatchInput, 
  SystemTestConfig, 
  runSystemTest 
};
