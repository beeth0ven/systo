import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { pipe, react, Store } from "../../src/index.js";

describe('React', () => {
  describe('Effect Lifecycle & Execution', () => {
    type State = {
      query: string | null;
      count?: number;
    }
    type Event = 
      | { type: 'set_query', query: string | null }
      | { type: 'ping' };

    it('should trigger effect on request change and cancel on null or disposal', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.query,
            effect: (query) => {
              log(`effect:start:${query}`);
              return () => log(`effect:teardown:${query}`);
            }
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { query: 'a' }],
            ['log', 'effect:start:a'],
            ['next', { query: 'a' }],
          ],
          20: [
            ['source.next', { query: 'a', count: 1 }],
            ['next', { query: 'a', count: 1 }],
          ],
          30: [
            ['source.next', { query: 'b' }],
            ['log', 'effect:teardown:a'],
            ['log', 'effect:start:b'],
            ['next', { query: 'b' }],
          ],
          40: [
            ['source.next', { query: null }],
            ['log', 'effect:teardown:b'],
            ['next', { query: null }],
          ],
          50: [
            ['source.next', { query: undefined as any }],
            ['next', { query: undefined as any }],
          ],
          60: [
            ['source.next', { query: 'c' }],
            ['log', 'effect:start:c'],
            ['next', { query: 'c' }],
          ],
          70: [
            ['dispose'],
            ['log', 'effect:teardown:c'],
            ['source.dispose'],
          ],
          80: [
            ['source.next', { query: 'd' }],
          ],
        },
      });
    });
    it('should not run effect when initial state produces null or undefined request', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.query,
            effect: (query) => {
              log(`effect:start:${query}`);
              return () => log(`effect:teardown:${query}`);
            }
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { query: null }],
            ['next', { query: null }],
          ],
          20: [
            ['source.next', { query: undefined as any }],
            ['next', { query: undefined as any }],
          ],
          30: [
            ['source.next', { query: 'a' }],
            ['log', 'effect:start:a'],
            ['next', { query: 'a' }],
          ],
          40: [
            ['dispose'],
            ['log', 'effect:teardown:a'],
            ['source.dispose'],
          ],
        },
      });
    });
  });
  describe('Teardown & Cleanup Variants', () => {
    type State = { task: string | null };
    type Event = string;
    
    it('should support Disposable object returned from effect', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.task,
            effect: (task) => {
              log(`effect:start:${task}`);
              return {
                dispose: () => log(`effect:teardown:${task}`),
              };
            }
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { task: 'task1' }],
            ['log', 'effect:start:task1'],
            ['next', { task: 'task1' }],
          ],
          20: [
            ['source.next', { task: 'task2' }],
            ['log', 'effect:teardown:task1'],
            ['log', 'effect:start:task2'],
            ['next', { task: 'task2' }],
          ],
          30: [
            ['dispose'],
            ['log', 'effect:teardown:task2'],
            ['source.dispose'],
          ],
        },
      });
    });
    it('should support void / no teardown returned from effect', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.task,
            effect: (task) => {
              log(`fire-and-forget:${task}`);
            }
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { task: 'task1' }],
            ['log', 'fire-and-forget:task1'],
            ['next', { task: 'task1' }],
          ],
          20: [
            ['source.next', { task: 'task2' }],
            ['log', 'fire-and-forget:task2'],
            ['next', { task: 'task2' }],
          ],
          30: [
            ['dispose'],
            ['source.dispose'],
          ],
        },
      });
    });

    it('should immediately dispose effect if store is disposed synchronously during effect creation', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => {
          let store: Store<State, Event>;
          const system = pipe(
            mockSource,
            react({
              request: (state) => state.task,
              effect: (task) => {
                log(`effect:start:${task}`);
                if (task === 'cancel_sync') {
                  store.dispose();
                }
                return () => log(`effect:teardown:${task}`);
              }
            })
          )
          return {
            observe: (observer) => (store = system.observe(observer))
          }
        },
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { task: 'task1' }],
            ['log', 'effect:start:task1'],
            ['next', { task: 'task1' }],
          ],
          20: [
            ['source.next', { task: 'cancel_sync' }],
            ['log', 'effect:teardown:task1'],
            ['log', 'effect:start:cancel_sync'],
            ['source.dispose'],
            ['log', 'effect:teardown:cancel_sync'],
          ],
          30: [
            ['source.next', { task: 'task2' }],
          ],
        },
      });
    });
  });
  describe('Asynchronous Effects & Feedback Loop', () => {
    type State = {
      userId: string | null,
      userName?: string,
    };

    type Event = 
      | { type: 'fetched'; name: string }
      | { type: 'error'; message: string };
      
    it('should handle async effect and dispatch result to source', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.userId,
            effect: (userId, dispatch) => {
              log(`fetch:start:${userId}`);
              const timer = setTimeout(() => {
                log(`fetch:complete:${userId}`);
                dispatch({ type: 'fetched', name: `User_${userId}` });
              }, 30);
              return () => {
                log(`fetch:cancel:${userId}`);
                clearTimeout(timer);
              };
            }, 
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { userId: 'u1' }],
            ['log', 'fetch:start:u1'],
            ['next', { userId: 'u1' }],
          ],
          40: [
            ['log', 'fetch:complete:u1'],
            ['source.dispatch', { type: 'fetched', name: 'User_u1' }],
            ['source.next', { userId: 'u1', userName: 'User_u1' }],
            ['next', { userId: 'u1', userName: 'User_u1' }],
          ],
          50: [
            ['dispose'],
            ['log', 'fetch:cancel:u1'],
            ['source.dispose'],
          ],
        },
      });
    });
    it('should cancel in-flight async effect when new request arrives before completion', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.userId,
            effect: (userId, dispatch) => {
              log(`fetch:start:${userId}`);
              const timer = setTimeout(() => {
                log(`fetch:complete:${userId}`);
                dispatch({ type: 'fetched', name: `User_${userId}` });
              }, 30);
              return () => {
                log(`fetch:cancel:${userId}`);
                clearTimeout(timer);
              };
            } 
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { userId: 'u1' }],
            ['log', 'fetch:start:u1'],
            ['next', { userId: 'u1' }],
          ],
          20: [
            ['source.next', { userId: 'u2' }],
            ['log', 'fetch:cancel:u1'],
            ['log', 'fetch:start:u2'],
            ['next', { userId: 'u2' }],
          ],
          50: [
            ['log', 'fetch:complete:u2'],
            ['source.dispatch', { type: 'fetched', name: 'User_u2' }],
            ['source.next', { userId: 'u2', userName: 'User_u2' }],
            ['next', { userId: 'u2', userName: 'User_u2' }],
          ],
          60: [
            ['dispose'],
            ['log', 'fetch:cancel:u2'],
            ['source.dispose'],
          ],
        },
      });

    });
    it('should drop dispatch calls from stale effects if async timer was not cleared', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.userId,
            effect: (userId, dispatch) => {
              log(`fetch:start:${userId}`);
              setTimeout(() => {
                log(`stale:timer:${userId}`);
                dispatch({ type: 'fetched', name: `User_${userId}` });
              }, 30);
              return () => log(`fetch:cancel:${userId}`);
            } 
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { userId: 'u1' }],
            ['log', 'fetch:start:u1'],
            ['next', { userId: 'u1' }],
          ],
          20: [
            ['source.next', { userId: 'u2' }],
            ['log', 'fetch:cancel:u1'],
            ['log', 'fetch:start:u2'],
            ['next', { userId: 'u2' }],
          ],
          40: [
            ['log', 'stale:timer:u1'],
          ],
          50: [
            ['log', 'stale:timer:u2'],
            ['source.dispatch', { type: 'fetched', name: 'User_u2' }],
            ['source.next', { userId: 'u2', userName: 'User_u2' }],
            ['next', { userId: 'u2', userName: 'User_u2' }],
          ],
          60: [
            ['dispose'],
            ['log', 'fetch:cancel:u2'],
            ['source.dispose'],
          ],
        },
      });

    });
    it('should drop dispatch calls if async effect resolves after store disposal', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.userId,
            effect: (userId, dispatch) => {
              log(`effect:start:${userId}`);
              setTimeout(() => {
                log(`effect:fired:${userId}`);
                dispatch({ type: 'fetched', name: `User_${userId}` });
              }, 30);
              return () => log(`effect:teardown:${userId}`);
            } 
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { userId: 'u1' }],
            ['log', 'effect:start:u1'],
            ['next', { userId: 'u1' }],
          ],
          20: [
            ['dispose'],
            ['log', 'effect:teardown:u1'],
            ['source.dispose'],
          ],
          40: [
            ['log', 'effect:fired:u1'],
          ],
        },
      });

    });
    it('should allow effect to dispatch an array of events (batch dispatch)', async () => {
      type BatchState = { step: number | null };
      type BatchEvent = 'stepA' | 'stepB';

      await runSystemTest<BatchState, BatchEvent, BatchState, BatchEvent>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.step,
            effect: (step, dispatch) => {
              log(`batch:start:${step}`);
              setTimeout(() => dispatch(['stepA', 'stepB']), 10);
            }
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { step: 1 }],
            ['log', 'batch:start:1'],
            ['next', { step: 1 }],
          ],
          20: [
            ['source.dispatch', ['stepA', 'stepB']],
          ],
          30: [
            ['dispose'],
            ['source.dispose'],
          ],
        },
      })
    });
  });
  describe('Custom Equality Comparator (areEqual)', () => {
    type State = {
      filter: { text: string; page: number } | null;
    }

    type Event = { type: 'loaded'; count: number };

    it('should use custom areEqual to prevent re-running effect on object identity change', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.filter,
            areEqual: (previous, current) => previous.text === current.text && previous.page === current.page,
            effect: ({ text, page }) => {
              log(`search:${text}:p${page}`);
              return () => log(`cancel:${text}:p${page}`);
            },
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { filter: { text: 'react', page: 1 }}],
            ['log', 'search:react:p1'],
            ['next', { filter: { text: 'react', page: 1 }}],
          ],
          20: [
            ['source.next', { filter: { text: 'react', page: 1 }}],
            ['next', { filter: { text: 'react', page: 1 }}],
          ],
          30: [
            ['source.next', { filter: { text: 'react', page: 2 }}],
            ['log', 'cancel:react:p1'],
            ['log', 'search:react:p2'],
            ['next', { filter: { text: 'react', page: 2 }}],
          ],
          40: [
            ['dispose'],
            ['log', 'cancel:react:p2'],
            ['source.dispose'],
          ],
        },
      })
    });
    it('should re-trigger effect when areEqual is not provided and request returns a new object reference', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.filter,
            effect: ({ text, page }) => {
              log(`search:${text}:p${page}`);
              return () => log(`cancel:${text}:p${page}`);
            },
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { filter: { text: 'react', page: 1 }}],
            ['log', 'search:react:p1'],
            ['next', { filter: { text: 'react', page: 1 }}],
          ],
          20: [
            ['source.next', { filter: { text: 'react', page: 1 }}],
            ['log', 'cancel:react:p1'],
            ['log', 'search:react:p1'],
            ['next', { filter: { text: 'react', page: 1 }}],
          ],
          30: [
            ['dispose'],
            ['log', 'cancel:react:p1'],
            ['source.dispose'],
          ],
        },
      });
    });
  });
  describe('External Event Passthrough', () => {
    type State = number;
    type Event = 'inc' | 'dec' | 'reset';

    it('should forward single and batch external dispatches to source', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          react({
            request: () => null,
            effect: () => {},
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', 0],
            ['next', 0],
          ],
          20: [
            ['dispatch', 'inc'],
            ['source.dispatch', 'inc'],
            ['source.next', 1],
            ['next', 1],
          ],
          30: [
            ['dispatch', ['inc', 'dec', 'reset']],
            ['source.dispatch', ['inc', 'dec', 'reset']],
            ['source.next', 0],
            ['next', 0],
          ],
          40: [
            ['dispose'],
            ['source.dispose'],
          ],
          50: [
            ['dispatch', 'inc'],
            ['source.next', 5],
          ],
        },
      });
    });
    // TODO: refactor this test by moving it to test util tests, since this is mainly testing `test util` not `react` operator.
    it('should associate reactive response with correct dispatch occurrence when multiple dispatches occur at the same timestamp', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          react({
            request: () => null,
            effect: () => { },
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', 0],
            ['next', 0],
          ],
          20: [
            ['dispatch', 'inc'],
            ['source.dispatch', 'inc'],
            ['dispatch', 'inc'],
            ['source.dispatch', 'inc'],
            ['source.next', 2],
            ['next', 2],
          ],
          30: [
            ['dispose'],
            ['source.dispose'],
          ],
        },
      })
    });
    it('should not forward empty array dispatch to source', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          react({
            request: () => null,
            effect: () => {},
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', 0],
            ['next', 0],
          ],
          20: [
            ['dispatch', []],
          ],
          30: [
            ['dispose'],
            ['source.dispose'],
          ],
        },
      });
    });
  });
  describe('Multiple Observers', () => {
    type State = { query: string };
    type Event = string;
    it('should maintain independent stores and effects for each observer', async () => {
      await runSystemTest<State, Event, State, Event>({
        systemFactory: (mockSource, log) => pipe(
          mockSource,
          react({
            request: (state) => state.query,
            effect: (query) => {
              log(`effect:start:${query}`);
              return () => log(`effect:cancel:${query}`);
            }
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['observe2'],
            ['source.observe2'],
            ['source.next', { query: 'r1' }],
            ['log', 'effect:start:r1'],
            ['next', { query: 'r1' }],
            ['source.next2', { query: 'r2' }],
            ['log', 'effect:start:r2'],
            ['next2', { query: 'r2' }],
          ],
          20: [
            ['dispatch', 'update'],
            ['source.dispatch', 'update'],
            ['source.next', { query: 'r1_next' }],
            ['log', 'effect:cancel:r1'],
            ['log', 'effect:start:r1_next'],
            ['next', { query: 'r1_next' }],
            ['dispatch2', 'update'],
            ['source.dispatch2', 'update'],
            ['source.next2', { query: 'r2_next' }],
            ['log', 'effect:cancel:r2'],
            ['log', 'effect:start:r2_next'],
            ['next2', { query: 'r2_next' }],
          ],
          30: [
            ['dispose'],
            ['log', 'effect:cancel:r1_next'],
            ['source.dispose'],
          ],
          40: [
            ['dispose2'],
            ['log', 'effect:cancel:r2_next'],
            ['source.dispose2'],
          ],
        },
      });
    });
  });
})
