import { describe, expect, it, vi } from "vitest";
import { on, pipe, scan } from "../../../src/index.js";
import { Log, Output, OutputTimeline, setupScenario, setupSystemTest } from "../../test-utils/index.js";

type CounterState = number;
type CounterEvent = 'inc';

describe('Executable Docs Runner (Rosetta Stone)', () => {
  it('setupScenario is equivalent to imperative System.observe / Store.dispatch / Store.dispose', async () => {
    const createCounter = (log: Log) => pipe(
      scan<CounterState, CounterEvent>({
        initialState: 0,
        reduce: (state, _event) => state + 1,
      }),
      on({
        init: () => log('init'),
        dispose: () => log('dispose'),
      }),
    );

    // 1. Imperative usage (what happens in production code)
    vi.useFakeTimers();
    try {
      const startTime = Date.now();
      const now = () => Date.now() - startTime;
      const trace: OutputTimeline<never, CounterState> = {};
      const record = (output: Output<never, CounterState>) => {
        (trace[now()] ??= []).push(output);
      };

      const system = createCounter((message) => record({ type: 'log', message }));
      let store: ReturnType<typeof system.observe>;

      setTimeout(() => {
        store = system.observe({
          next: (state) => record({ type: 'next', state }),
        });
      }, 10);

      setTimeout(() => {
        store.dispatch('inc');
      }, 20);

      setTimeout(() => {
        store.dispose();
      }, 30);

      await vi.advanceTimersByTimeAsync(100);

      expect(trace).toEqual<OutputTimeline<never, CounterState>>({
        10: [
          { type: 'log', message: 'init' },
          { type: 'next', state: 0 },
        ],
        20: [{ type: 'next', state: 1 }],
        30: [{ type: 'log', message: 'dispose' }],
      });

    } finally {
      vi.useRealTimers();
    }

    // 2. Equivalent declarative spec using `setupScenario`
    const { runScenario, observe, next, dispatch, log, dispose } = setupScenario(createCounter);

    await runScenario({
      10: [
        observe(),
        log('init'),
        next(0),
      ],
      20: [
        dispatch('inc'),
        next(1),
      ],
      30: [
        dispose(),
        log('dispose'),
      ],
    });
  });
  it('setupSystemTest extends setupScenario with mockSource for isolated operator testing', async () => {
    const { runSystemTest, observe, next, dispatch, dispose, log, source } =
      setupSystemTest<CounterState, CounterEvent>((mockSource, log) => pipe(
        mockSource,
        on({
          init: () => log('init'),
          next: (state) => log(`next: ${state}`),
          dispatch: (event) => log(`dispatch: ${event}`),
          dispose: () => log('dispose'),
        }),
      ));

    await runSystemTest({
      10: [
        observe(),
        log('init'),
        source.observe(),

        source.next(0),
        log('next: 0'),
        next(0),
      ],
      20: [
        dispatch('inc'),
        log('dispatch: inc'),
        source.dispatch('inc'),

        source.next(1),
        log('next: 1'),
        next(1),
      ],
      30: [
        dispose(),
        log('dispose'),
        source.dispose(),
      ],
    });
  });
});
