import { describe, it } from "vitest";
import { pipe, react, scan } from "../../../src/index.js";
import { setupScenario } from "../../test-utils/index.js";

describe('test-utils: setupScenario', () => {
  it('should test system lifecycle, single and batch event dispatches, and disposal (70% main story)', async () => {
    type State = number;
    type Event = 'inc' | 'dec';

    const system = scan<State, Event>({
      initialState: 0,
      reduce: (state, event) => {
        switch (event) {
          case 'inc':
            return state + 1;
          case 'dec':
            return state - 1;
        }
      },
    });

    // Automatically infers <State, Event> from `system`
    const { runScenario, observe, next, dispatch, dispose } = setupScenario(system);

    await runScenario({
      10: [
        observe(),
        next(0),
      ],
      20: [
        dispatch('inc'),
        next(1),
      ],
      30: [
        dispatch(['inc', 'inc', 'dec']),
        next(2),
      ],
      40: [
        dispose(),
      ],
      50: [
        dispatch('inc'),
        // Ignore after dispose
      ],
    });
  });
  it('should support factory mode with log and getStore for lifecycle tracing and synchronous self-disposal (20% advanced story)', async () => {
    type State = { task: string };
    type Event = { type: 'set'; task: string };

    const { runScenario, observe, next, dispatch, log } = setupScenario<State, Event>((log, getStore) => pipe(
      scan<State, Event>({
        initialState: { task: 'init' },
        reduce: (_state, event) => ({ task: event.task }),
      }),
      react({
        request: (state) => state.task,
        effect: (task) => {
          log(`effect:start:${task}`);
          if (task === 'stop') {
            getStore()?.dispose();
          }
          return () => log(`effect:teardown:${task}`);
        }
      }),
    ));

    await runScenario({
      10: [
        observe(),
        log('effect:start:init'),
        next({ task: 'init' }),
      ],
      20: [
        dispatch({ type: 'set', task: 'stop' }),
        log('effect:teardown:init'),
        log('effect:start:stop'),
        log('effect:teardown:stop'),
      ],
      30: [
        dispatch({ type: 'set', task: 'after' }),
      ],
    });
  });
  it('should support multiple downstream observers with observe2, dispatch2, dispose2, and next2 (multi-connection story)', async () => {
    type State = number;
    type Event = 'inc';

    const system = scan<State, Event>({
      initialState: 0,
      reduce: (state, _event) => state + 1,
    });

    const {
      runScenario,
      observe,
      observe2,
      next,
      next2,
      dispatch,
      dispatch2,
      dispose,
      dispose2,
    } = setupScenario(system);

    await runScenario({
      10: [
        observe(),
        next(0),
        observe2(),
        next2(0),
      ],
      20: [
        dispatch('inc'),
        next(1),
        dispatch2(['inc', 'inc']),
        next2(2),
      ],
      30: [
        dispose(),
        dispatch('inc'),
        dispatch2('inc'),
        next2(3),
      ],
      40: [
        dispose2(),
      ],
    });
  });
});
