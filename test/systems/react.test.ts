import { describe, expect, it, vi } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { Observer, pipe, react, System } from "../../src/index.js";

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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { query: 'a' }],
          [10, 'out', 'log', 'effect:start:a'],
          [10, 'out', 'next', { query: 'a' }],

          [20, 'in',  'source.next', { query: 'a', count: 1 }],
          [20, 'out',  'next', { query: 'a', count: 1 }],

          [30, 'in',  'source.next', { query: 'b' }],
          [30, 'out', 'log', 'effect:teardown:a'],
          [30, 'out', 'log', 'effect:start:b'],
          [30, 'out', 'next', { query: 'b' }],

          [40, 'in',  'source.next', { query: null }],
          [40, 'out', 'log', 'effect:teardown:b'],
          [40, 'out', 'next', { query: null }],

          [50, 'in',  'source.next', { query: undefined as any }],
          [50, 'out', 'next', { query: undefined as any }],

          [60, 'in',  'source.next', { query: 'c' }],
          [60, 'out', 'log', 'effect:start:c'],
          [60, 'out', 'next', { query: 'c' }],

          [70, 'in',  'dispose'],
          [70, 'out', 'log', 'effect:teardown:c'],
          [70, 'out', 'source.dispose'],

          [80, 'in', 'source.next', { query: 'd' }],
        ],
      })
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { query: null }],
          [10, 'out', 'next', { query: null }],

          [20, 'in',  'source.next', { query: undefined as any }],
          [20, 'out', 'next', { query: undefined as any }],

          [30, 'in',  'source.next', { query: 'a' }],
          [30, 'out', 'log', 'effect:start:a'],
          [30, 'out', 'next', { query: 'a' }],

          [40, 'in',  'dispose'],
          [40, 'out', 'log', 'effect:teardown:a'],
          [40, 'out', 'source.dispose'],
        ],
      })
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { task: 'task1' }],
          [10, 'out', 'log', 'effect:start:task1'],
          [10, 'out', 'next', { task: 'task1' }],

          [20, 'in',  'source.next', { task: 'task2' }],
          [20, 'out', 'log', 'effect:teardown:task1'],
          [20, 'out', 'log', 'effect:start:task2'],
          [20, 'out', 'next', { task: 'task2' }],

          [30, 'in',  'dispose'],
          [30, 'out', 'log', 'effect:teardown:task2'],
          [30, 'out', 'source.dispose'],
        ],
      })
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { task: 'task1' }],
          [10, 'out', 'log', 'fire-and-forget:task1'],
          [10, 'out', 'next', { task: 'task1' }],

          [20, 'in',  'source.next', { task: 'task2' }],
          [20, 'out', 'log', 'fire-and-forget:task2'],
          [20, 'out', 'next', { task: 'task2' }],

          [30, 'in',  'dispose'],
          [30, 'out', 'source.dispose'],
        ],
      })
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { userId: 'u1' }],
          [10, 'out', 'log', 'fetch:start:u1'],
          [10, 'out', 'next', { userId: 'u1' }],

          [40, 'out', 'log', 'fetch:complete:u1'],
          [40, 'out', 'source.dispatch', { type: 'fetched', name: 'User_u1' }],
          // TODO: see https://github.com/beeth0ven/systo/issues/2
          [41, 'in',  'source.next', { userId: 'u1', userName: 'User_u1' }],
          [41, 'out', 'next', { userId: 'u1', userName: 'User_u1' }],

          [50, 'in',  'dispose'],
          [50, 'out', 'log', 'fetch:cancel:u1'],
          [50, 'out', 'source.dispose'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { userId: 'u1' }],
          [10, 'out', 'log', 'fetch:start:u1'],
          [10, 'out', 'next', { userId: 'u1' }],

          [20, 'in',  'source.next', { userId: 'u2' }],
          [20, 'out', 'log', 'fetch:cancel:u1'],
          [20, 'out', 'log', 'fetch:start:u2'],
          [20, 'out', 'next', { userId: 'u2' }],

          [50, 'out', 'log', 'fetch:complete:u2'],
          [50, 'out', 'source.dispatch', { type: 'fetched', name: 'User_u2' }],
          // TODO: see https://github.com/beeth0ven/systo/issues/2
          [51, 'in',  'source.next', { userId: 'u2', userName: 'User_u2' }],
          [51, 'out', 'next', { userId: 'u2', userName: 'User_u2' }],

          [60, 'in',  'dispose'],
          [60, 'out', 'log', 'fetch:cancel:u2'],
          [60, 'out', 'source.dispose'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { userId: 'u1' }],
          [10, 'out', 'log', 'fetch:start:u1'],
          [10, 'out', 'next', { userId: 'u1' }],

          [20, 'in',  'source.next', { userId: 'u2' }],
          [20, 'out', 'log', 'fetch:cancel:u1'],
          [20, 'out', 'log', 'fetch:start:u2'],
          [20, 'out', 'next', { userId: 'u2' }],

          [40, 'out', 'log', 'stale:timer:u1'],

          [50, 'out', 'log', 'stale:timer:u2'],
          [50, 'out', 'source.dispatch', { type: 'fetched', name: 'User_u2' }],
          // TODO: see https://github.com/beeth0ven/systo/issues/2
          [51, 'in',  'source.next', { userId: 'u2', userName: 'User_u2' }],
          [51, 'out', 'next', { userId: 'u2', userName: 'User_u2' }],

          [60, 'in',  'dispose'],
          [60, 'out', 'log', 'fetch:cancel:u2'],
          [60, 'out', 'source.dispose'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { userId: 'u1' }],
          [10, 'out', 'log', 'effect:start:u1'],
          [10, 'out', 'next', { userId: 'u1' }],

          [20, 'in',  'dispose'],
          [20, 'out', 'log', 'effect:teardown:u1'],
          [20, 'out', 'source.dispose'],

          [40, 'out', 'log', 'effect:fired:u1'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { step: 1 }],
          [10, 'out', 'log', 'batch:start:1'],
          [10, 'out', 'next', { step: 1 }],

          [20, 'out', 'source.dispatch', ['stepA', 'stepB']],

          [30, 'in',  'dispose'],
          [30, 'out', 'source.dispose'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { filter: { text: 'react', page: 1 }}],
          [10, 'out', 'log', 'search:react:p1'],
          [10, 'out', 'next', { filter: { text: 'react', page: 1 }}],

          [20, 'in',  'source.next', { filter: { text: 'react', page: 1 }}],
          [20, 'out', 'next', { filter: { text: 'react', page: 1 }}],

          [30, 'in',  'source.next', { filter: { text: 'react', page: 2 }}],
          [30, 'out', 'log', 'cancel:react:p1'],
          [30, 'out', 'log', 'search:react:p2'],
          [30, 'out', 'next', { filter: { text: 'react', page: 2 }}],

          [40, 'in',  'dispose'],
          [40, 'out', 'log', 'cancel:react:p2'],
          [40, 'out', 'source.dispose'],
        ],
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', { filter: { text: 'react', page: 1 }}],
          [10, 'out', 'log', 'search:react:p1'],
          [10, 'out', 'next', { filter: { text: 'react', page: 1 }}],

          [20, 'in',  'source.next', { filter: { text: 'react', page: 1 }}],
          [20, 'out', 'log', 'cancel:react:p1'],
          [20, 'out', 'log', 'search:react:p1'],
          [20, 'out', 'next', { filter: { text: 'react', page: 1 }}],

          [30, 'in',  'dispose'],
          [30, 'out', 'log', 'cancel:react:p1'],
          [30, 'out', 'source.dispose'],
        ],
      })
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', 0],
          [10, 'out', 'next', 0],

          [20, 'in',  'dispatch', 'inc'],
          [20, 'out', 'source.dispatch', 'inc'],
          [20, 'in',  'source.next', 1],
          [20, 'out', 'next', 1],

          [30, 'in',  'dispatch', ['inc', 'dec', 'reset']],
          [30, 'out', 'source.dispatch', ['inc', 'dec', 'reset']],
          [30, 'in',  'source.next', 0],
          [30, 'out', 'next', 0],

          [40, 'in',  'dispose'],
          [40, 'out', 'source.dispose'],

          [50, 'in', 'dispatch', 'inc'],
          [50, 'in', 'source.next', 5],
        ],
      });
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
        events: [
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],
          [10, 'in',  'source.next', 0],
          [10, 'out', 'next', 0],

          [20, 'in',  'dispatch', []],

          [30, 'in',  'dispose'],
          [30, 'out', 'source.dispose'],
        ],
      });
    });
  });
  // TODO: see https://github.com/users/beeth0ven/projects/2/views/2?pane=issue&itemId=252595207
  describe('Multiple Observers', () => {
    it('should maintain independent stores and effects for each observer', () => {
      type State = { query: string };
      type Event = string;
      type Dispose = ReturnType<typeof vi.fn>;
      
      const logs: string[] = [];
      const sourceObservers: Observer<State>[] = [];
      const sourceDisposers: Dispose[] = [];

      const mockSource: System<State, Event> = {
        observe: (observer) => {
          sourceObservers.push(observer);
          const dispose = vi.fn();
          sourceDisposers.push(dispose);
          return {
            dispatch: vi.fn(),
            dispose,
          };
        },
      };

      const system: System<State, Event> = pipe(
        mockSource,
        react({
          request: (state) => state.query,
          effect: (query) => {
            logs.push(`effect:start:${query}`);
            return () => logs.push(`effect:cancel:${query}`);
          },
        }),
      );

      const store1 = system.observe({ next: vi.fn() });
      const store2 = system.observe({ next: vi.fn() });

      expect(sourceObservers).toHaveLength(2);

      sourceObservers[0].next({ query: 'r1' });
      expect(logs).toEqual(['effect:start:r1']);

      sourceObservers[1].next({ query: 'r2' });
      expect(logs).toEqual(['effect:start:r1', 'effect:start:r2']);
      logs.length = 0;

      store1.dispose();
      expect(logs).toEqual(['effect:cancel:r1']);
      expect(sourceDisposers[0]).toHaveBeenCalledTimes(1);
      expect(sourceDisposers[1]).toHaveBeenCalledTimes(0);

      store2.dispose();
      expect(logs).toEqual(['effect:cancel:r1', 'effect:cancel:r2']);
      expect(sourceDisposers[1]).toHaveBeenCalledTimes(1);
    });
  });
})
