import { describe, it } from "vitest"
import { on, pipe, react } from "../../../src/index.js";
import { setupSystemTest } from "../../test-utils/index.js";

describe('test-utils: setupSystemTest', () => {
  it('should test an operator with mockSource lifecycle, dispatches, and synchronous source emissions (70% main story)', async () => {
    type SourceState = number;
    type SourceEvent = 'inc' | 'dec';
    type State = SourceState;
    type Event = SourceEvent;

    const { runSystemTest, observe, next, dispatch, dispose, log, source } = setupSystemTest<SourceState, SourceEvent, State, Event>(
      (mockSource, log) => pipe(
        mockSource,
        on({
          init: () => log('init'),
          next: (state) => log(`next: ${state}`),
          dispatch: (event) => log(`dispatch: ${event}`),
          dispose: () => log('dispose'),
        }),
      ),
    );

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
        dispatch('dec'),
        log('dispatch: dec'),
        source.dispatch('dec', { emit: 0 }), // synchronous source emissions
        log('next: 0'),
        next(0),
      ],
      40: [
        dispatch(['inc', 'inc', 'dec']),
        log('dispatch: inc,inc,dec'),
        source.dispatch(['inc', 'inc', 'dec'], { emit: 1 }),
        log('next: 1'),
        next(1),
      ],
      50: [
        dispose(),
        log('dispose'),
        source.dispose(),
      ],
      60: [
        dispatch('dec'),
        // Ignore after dispose
      ],
    });
  });
  it('should support deferred systemFactory, same-timestamp multi-dispatch emissions, async effect responses, and getStore (20% advanced story)', async () => {
    type State = { query: string | null };
    type Event = 'ping' | 'fetched';

    // Overload 2: bind types once, pass `systemFactory` per `runSystemTest` call
    const { runSystemTest, observe, next, dispatch, log, source } = setupSystemTest<State, Event>();

    await runSystemTest(
      (mockSource, log, getStore) => pipe(
        mockSource,
        react({
          request: (state) => state.query,
          effect: (query, dispatch) => {
            log(`effect:start:${query}`);
            let dispose: (() => void) | null = null; 
            switch (query) {
              case 'fetch': {
                const timer = setTimeout(() => {
                  log('fetch:complete');
                  dispatch('fetched');
                }, 20);
                dispose = () => clearTimeout(timer);
                break;
              }
              case 'cancel_sync':
                getStore()?.dispose();
                break;
              default:
                break;
            }
            return () => {
              log(`effect:teardown:${query}`);
              dispose?.();
            };
          },
        }),
      ),
      {
        10: [
          observe(),
          source.observe({ emit: { query: 'init' }}),
          log('effect:start:init'),
          next({ query: 'init' }),
        ],
        20: [
          dispatch('ping'),
          source.dispatch('ping'),
          dispatch('ping'),
          source.dispatch('ping', { emit: { query: 'fetch' }}),
          log('effect:teardown:init'),
          log('effect:start:fetch'),
          next({ query: 'fetch' }),
        ],
        40: [
          log('fetch:complete'),
          source.dispatch('fetched', { emit: { query: 'cancel_sync' }}),
          log('effect:teardown:fetch'),
          log('effect:start:cancel_sync'),
          source.dispose(),
          log('effect:teardown:cancel_sync'),
        ],
        50: [
          source.next({ query: 'ignored' }),
        ],
      },
    );
  });
  it('should support multiple upstream and downstream connections with *2 and source.*2 (multi-connection story)', async () => {
    type State = number;
    type Event = 'inc';

    const {
      runSystemTest,
      observe,
      observe2,
      next,
      next2,
      dispatch,
      dispatch2,
      dispose,
      dispose2,
      source,
    } = setupSystemTest<State, Event>((mockSource) => pipe(mockSource, on({})));

    await runSystemTest({
      10: [
        observe(),
        source.observe({ emit: 0 }),
        next(0),
        observe2(),
        source.observe2({ emit: 10 }),
        next2(10),
      ],
      20: [
        dispatch('inc'),
        source.dispatch('inc', { emit: 1 }),
        next(1),
        dispatch2('inc'),
        source.dispatch2('inc', { emit: 11 }),
        next2(11),
      ],
      30: [
        dispose(),
        source.dispose(),
      ],
      40: [
        dispose2(),
        source.dispose2(),
      ],
    });
  });
});
