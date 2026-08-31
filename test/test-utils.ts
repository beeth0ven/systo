import { expect, vi } from 'vitest';
import { Observer, Store, System } from '../src/core.js';

type Input<Event, SourceState> =
  | ['observe']
  | ['dispatch', Event | readonly Event[]]
  | ['dispose']
  | ['observe2']
  | ['dispatch2', Event | readonly Event[]]
  | ['dispose2']
  | ['source.next', SourceState];

type Output<State, SourceEvent> =
  | ['next', State]
  | ['next2', State]
  | ['source.observe']
  | ['source.dispatch', SourceEvent | readonly SourceEvent[]]
  | ['source.dispose']
  | ['log', string];

type TimedInput<Event, SourceState> = [number, ...Input<Event, SourceState>];
type TimedOutput<State, SourceEvent> = [number, ...Output<State, SourceEvent>];

type TestEvent<State, Event, SourceState, SourceEvent> =
  [number, 'in', ...Input<Event, SourceState>] | [number, 'out', ...Output<State, SourceEvent>];

interface SystemTestConfig<State, Event, SourceState, SourceEvent> {
  systemFactory: (
    mockSource: System<SourceState, SourceEvent>,
    log: (message: string) => void,
  ) => System<State, Event>;
  events: TestEvent<State, Event, SourceState, SourceEvent>[];
}

async function runSystemTest<State, Event, SourceState, SourceEvent>(
  config: SystemTestConfig<State, Event, SourceState, SourceEvent>,
): Promise<void> {
  vi.useFakeTimers();
  const tester = new Tester(config);
  try {
    tester.schedule();
    const maxInputTime = Math.max(0, ...tester.inputs.map(([time]) => time));
    await vi.advanceTimersByTimeAsync(maxInputTime + 990); // for delay operator like `StateDelay`.`
    expect(tester.outputs).toEqual(tester.expectedOutputs);
  } finally {
    vi.useRealTimers();
  }
}

class Tester<State, Event, SourceState, SourceEvent> {
  public readonly inputs: TimedInput<Event, SourceState>[];
  public readonly expectedOutputs: TimedOutput<State, SourceEvent>[];
  public readonly outputs: TimedOutput<State, SourceEvent>[] = [];
  private readonly consumedInputIndices = new Set<number>();
  private readonly startTime = Date.now();
  private store?: Store<State, Event>;
  private store2?: Store<State, Event>;
  private sourceNext?: (value: SourceState) => void;

  private readonly observer: Observer<State> = {
    next: (state) => this.record(['next', state]),
  };

  private readonly observer2: Observer<State> = {
    next: (state) => this.record(['next2', state]),
  };

  constructor(private readonly config: SystemTestConfig<State, Event, SourceState, SourceEvent>) {
    this.inputs = config.events
      .filter((event): event is [number, 'in', ...Input<Event, SourceState>] => event[1] === 'in')
      .map(([time, _, ...input]) => [time, ...input]);
    
    this.expectedOutputs = config.events
      .filter(
        (event): event is [number, 'out', ...Output<State, SourceEvent>] => event[1] === 'out',
      )
      .map(([time, _, ...output]) => [time, ...output]);
  }

  private _system?: System<State, Event>;
  private get system(): System<State, Event> {
    if (!this._system) {
      const mockSource: System<SourceState, SourceEvent> = {
        observe: (observer: Observer<SourceState>) => {
          this.record(['source.observe']);
          this.sourceNext = (value) => {
            observer.next(value);
          };
          return {
            dispatch: (event: SourceEvent | SourceEvent[]) => {
              this.record(['source.dispatch', event]);

              const nextIndex = this.inputs.findIndex(
                (_, index) => !this.consumedInputIndices.has(index),
              );

              if (nextIndex !== -1) {
                const nextEvent = this.inputs[nextIndex];
                if (nextEvent[0] === this.time && nextEvent[1] === 'source.next') {
                  this.consumedInputIndices.add(nextIndex);
                  this.sourceNext?.(nextEvent[2]);
                }
              }
            },
            dispose: () => {
              this.record(['source.dispose']);
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
    this.inputs.forEach(([time, ...input], index) => {
      setTimeout(() => {
        if (this.consumedInputIndices.has(index)) {
          return;
        }
        this.consumedInputIndices.add(index);
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
        }
      }, time);
    });
  }
}

export { Input, Output, TimedInput, TimedOutput, SystemTestConfig, runSystemTest };
