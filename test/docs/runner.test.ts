import { describe, expect, it, vi } from "vitest";
import { on, pipe, scan } from "../../src/index.js";
import { Log } from "../types.js";
import { runScenario, runSystemTest } from "../test-utils.js";

type CounterState = number;
type CounterEvent = 'inc';

describe('Executable Docs Runner (Rosetta Stone)', () => {
  it('runScenario is equivalent to imperative System.observe / Store.dispatch / Store.dispose', async () => {
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
      const trace: any[] = [];

      const system = createCounter((msg) => trace.push([now(), 'log', msg]));
      let store: ReturnType<typeof system.observe>;

      setTimeout(() => {
        store = system.observe({
          next: (state) => trace.push([now(), 'next', state]),
        });
      }, 10);

      setTimeout(() => {
        store.dispatch('inc');
      }, 20);

      setTimeout(() => {
        store.dispose();
      }, 30);

      await vi.advanceTimersByTimeAsync(100);

      expect(trace).toEqual([
        [10, 'log', 'init'],
        [10, 'next', 0],
        [20, 'next', 1],
        [30, 'log', 'dispose'],
      ]);
    } finally {
      vi.useRealTimers();
    }

    // 2. Equivalent declarative spec using 'runScenario'
    await runScenario(createCounter, {
      10: [
        ['observe'],
        ['log', 'init'],
        ['next', 0],
      ],
      20: [
        ['dispatch', 'inc'],
        ['next', 1],
      ],
      30: [
        ['dispose'],
        ['log', 'dispose'],
      ],
    });
  });

  it('runSystemTest extends runScenario with mockSource for isolated operator testing', async () => {
    await runSystemTest<CounterState, CounterEvent>({
      systemFactory: (mockSource, log) => pipe(
        mockSource,
        on({
          init: () => log('init'),
          next: (state) => log(`next: ${state}`),
          dispatch: (event) => log(`dispatch: ${event}`),
          dispose: () => log('dispose'),
        }),
      ),
      events: {
        10: [
          ['observe'],
          ['log', 'init'],
          ['source.observe'],

          ['source.next', 0],
          ['log', 'next: 0'],
          ['next', 0],
        ],
        20: [
          ['dispatch', 'inc'],
          ['log', 'dispatch: inc'],
          ['source.dispatch', 'inc'],
          
          ['source.next', 1],
          ['log', 'next: 1'],
          ['next', 1],
        ],
        30: [
          ['dispose'],
          ['log', 'dispose'],
          ['source.dispose'],
        ],
      },
    });
  });
});
