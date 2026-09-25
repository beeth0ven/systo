import { describe, expect, it } from 'vitest';
import { TurnScheduler } from '../../src/index.js';

describe('TurnScheduler', () => {
  describe('Rule 4: Idle Phase (stack.length === 0)', () => {
    it('executes scheduleInit immediately and returns the value', () => {
      const target = {};
      let executed = false;
      const result = TurnScheduler.scheduleInit(target, () => {
        executed = true;
        return 42;
      });
      expect(executed).toBe(true);
      expect(result).toBe(42);
    });

    it('executes scheduleEmit immediately', () => {
      const target = {};
      const logs: string[] = [];
      TurnScheduler.scheduleEmit(target, () => {
        logs.push('emit');
      });
      expect(logs).toEqual(['emit']);
    });

    it('executes scheduleDispatch immediately', () => {
      const target = {};
      const logs: string[] = [];
      TurnScheduler.scheduleDispatch(target, () => {
        logs.push('dispatch');
      });
      expect(logs).toEqual(['dispatch']);
    });

    it('treats distinct objects with identical properties as distinct targets', () => {
      const target1 = { id: 1 };
      const target2 = { id: 1 };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(target1, () => {
        logs.push('target1:start');
        TurnScheduler.scheduleDispatch(target2, () => {
          logs.push('target2:start');
        });
        logs.push('target1:end');
      });

      expect(logs).toEqual([
        'target1:start',
        'target2:start',
        'target1:end',
      ]);
    });
  });

  describe('Rule 1: Initialization Phase (last.kind === "init")', () => {
    it('queues scheduleEmit called during init and executes it after init completes', () => {
      const target = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(target, () => {
        logs.push('init:start');
        TurnScheduler.scheduleEmit(target, () => {
          logs.push('emit');
        });
        logs.push('init:end');
      });

      logs.push('after:init');

      expect(logs).toEqual([
        'init:start',
        'init:end',
        'emit',
        'after:init',
      ]);
    });

    it('queues scheduleDispatch called during init and executes it after init completes', () => {
      const target = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(target, () => {
        logs.push('init:start');
        TurnScheduler.scheduleDispatch(target, () => {
          logs.push('dispatch');
        });
        logs.push('init:end');
      });

      logs.push('after:init');

      expect(logs).toEqual([
        'init:start',
        'init:end',
        'dispatch',
        'after:init',
      ]);
    });

    it('preserves FIFO ordering of multiple emits and dispatches queued during init', () => {
      const targetA = { name: 'storeA' };
      const targetB = { name: 'storeB' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(targetA, () => {
        logs.push('init');
        TurnScheduler.scheduleEmit(targetA, () => logs.push('emit:A'));
        TurnScheduler.scheduleDispatch(targetB, () => logs.push('dispatch:B'));
        TurnScheduler.scheduleEmit(targetB, () => logs.push('emit:B'));
      });

      expect(logs).toEqual([
        'init',
        'emit:A',
        'dispatch:B',
        'emit:B',
      ]);
    });

    it('defers queued tasks until the outermost init completes during nested initializations', () => {
      const parent = { name: 'parent' };
      const child = { name: 'child' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(parent, () => {
        logs.push('parent:init:start');
        TurnScheduler.scheduleInit(child, () => {
          logs.push('child:init:start');
          TurnScheduler.scheduleEmit(child, () => logs.push('child:emit'));
          logs.push('child:init:end');
        });
        logs.push('parent:init:middle');
        TurnScheduler.scheduleEmit(parent, () => logs.push('parent:emit'));
        logs.push('parent:init:end');
      });

      expect(logs).toEqual([
        'parent:init:start',
        'child:init:start',
        'child:init:end',
        'parent:init:middle',
        'parent:init:end',
        'child:emit',
        'parent:emit',
      ]);
    });

    it('correctly returns values from nested scheduleInit calls', () => {
      const parent = { name: 'parent' };
      const child = { name: 'child' };
      const result = TurnScheduler.scheduleInit(parent, () => {
        const childResult = TurnScheduler.scheduleInit(child, () => {
          return 'child-ready';
        });
        return `parent-ready:${childResult}`;
      });

      expect(result).toBe('parent-ready:child-ready');
    });
  });

  describe('Rule 2: Downward Emission Phase (last.kind === "emit")', () => {
    it('executes downward scheduleEmit for a different target synchronously on the call stack', () => {
      const upstream = { name: 'upstream' };
      const downstream = { name: 'downstream' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(upstream, () => {
        logs.push('upstream:emit:start');
        TurnScheduler.scheduleEmit(downstream, () => {
          logs.push('downstream:emit');
        });
        logs.push('upstream:emit:end');
      });

      expect(logs).toEqual([
        'upstream:emit:start',
        'downstream:emit',
        'upstream:emit:end',
      ]);
    });

    it('queues any scheduleDispatch called during emit (RTC guarantee for observer reactions)', () => {
      const source = { name: 'source' };
      const otherTarget = { name: 'other' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(source, () => {
        logs.push('source:emit:start');
        // Any dispatch (even to a different target) must be queued during emit
        TurnScheduler.scheduleDispatch(otherTarget, () => {
          logs.push('observer:dispatch');
        });
        logs.push('source:emit:end');
      });

      logs.push('after:emit');

      expect(logs).toEqual([
        'source:emit:start',
        'source:emit:end',
        'observer:dispatch',
        'after:emit',
      ]);
    });

    it('queues re-entrant scheduleEmit for the same target to prevent infinite loops', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(store, () => {
        logs.push('emit:start');
        TurnScheduler.scheduleEmit(store, () => {
          logs.push('re-entrant:emit');
        });
        logs.push('emit:end');
      });

      expect(logs).toEqual([
        'emit:start',
        'emit:end',
        're-entrant:emit',
      ]);
    });

    it('detects cyclic emit chains across multiple targets and queues re-entrant emits', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(storeA, () => {
        logs.push('storeA:emit:start');
        TurnScheduler.scheduleEmit(storeB, () => {
          logs.push('storeB:emit:start');
          TurnScheduler.scheduleEmit(storeA, () => {
            logs.push('storeA:re-entrant:emit');
          });
          logs.push('storeB:emit:end');
        });
        logs.push('storeA:emit:end');
      });

      expect(logs).toEqual([
        'storeA:emit:start',
        'storeB:emit:start',
        'storeB:emit:end',
        'storeA:emit:end',
        'storeA:re-entrant:emit',
      ]);
    });

    it('detects re-entrant emit across deep call stacks (A -> B -> C -> A)', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const storeC = { name: 'storeC' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(storeA, () => {
        logs.push('storeA:emit:start');
        TurnScheduler.scheduleEmit(storeB, () => {
          logs.push('storeB:emit:start');
          TurnScheduler.scheduleEmit(storeC, () => {
            logs.push('storeC:emit:start');
            TurnScheduler.scheduleEmit(storeA, () => {
              logs.push('storeA:re-entrant:emit');
            });
            logs.push('storeC:emit:end');
          });
          logs.push('storeB:emit:end');
        });
        logs.push('storeA:emit:end');
      });

      expect(logs).toEqual([
        'storeA:emit:start',
        'storeB:emit:start',
        'storeC:emit:start',
        'storeC:emit:end',
        'storeB:emit:end',
        'storeA:emit:end',
        'storeA:re-entrant:emit',
      ]);
    });

    it('executes multiple dispatches triggered during emit in FIFO order after emission completes', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(store, () => {
        logs.push('emit:start');
        TurnScheduler.scheduleDispatch(store, () => logs.push('dispatch:1'));
        TurnScheduler.scheduleDispatch(store, () => logs.push('dispatch:2'));
        TurnScheduler.scheduleDispatch(store, () => logs.push('dispatch:3'));
        logs.push('emit:end');
      });

      expect(logs).toEqual([
        'emit:start',
        'emit:end',
        'dispatch:1',
        'dispatch:2',
        'dispatch:3',
      ]);
    });
  });

  describe('Rule 3: Upward Forwarding Phase (last.kind === "dispatch")', () => {
    it('executes upward scheduleDispatch for a different target synchronously on the call stack', () => {
      const viewStore = { name: 'viewStore' };
      const rootStore = { name: 'rootStore' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(viewStore, () => {
        logs.push('viewStore:dispatch:start');
        TurnScheduler.scheduleDispatch(rootStore, () => {
          logs.push('rootStore:dispatch');
        });
        logs.push('viewStore:dispatch:end');
      });

      expect(logs).toEqual([
        'viewStore:dispatch:start',
        'rootStore:dispatch',
        'viewStore:dispatch:end',
      ]);
    });

    it('executes scheduleEmit synchronously during dispatch (state reduction)', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(store, () => {
        logs.push('dispatch:start');
        TurnScheduler.scheduleEmit(store, () => {
          logs.push('emit');
        });
        logs.push('dispatch:end');
      });

      expect(logs).toEqual([
        'dispatch:start',
        'emit',
        'dispatch:end',
      ]);
    });

    it('queues observer dispatches that occur during synchronous state emission within dispatch', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(store, () => {
        logs.push('dispatch:start');
        TurnScheduler.scheduleEmit(store, () => {
          logs.push('emit');
          TurnScheduler.scheduleDispatch(store, () => {
            logs.push('observer:dispatch');
          });
        });
        logs.push('dispatch:end');
      });

      expect(logs).toEqual([
        'dispatch:start',
        'emit',
        'dispatch:end',
        'observer:dispatch',
      ]);
    });

    it('queues re-entrant scheduleDispatch for the same target to prevent infinite loops', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(store, () => {
        logs.push('dispatch:start');
        TurnScheduler.scheduleDispatch(store, () => {
          logs.push('re-entrant:dispatch');
        });
        logs.push('dispatch:end');
      });

      expect(logs).toEqual([
        'dispatch:start',
        'dispatch:end',
        're-entrant:dispatch',
      ]);
    });

    it('detects cyclic dispatch chains across multiple targets and queues re-entrant dispatch', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(storeA, () => {
        logs.push('storeA:dispatch:start');
        TurnScheduler.scheduleDispatch(storeB, () => {
          logs.push('storeB:dispatch:start');
          TurnScheduler.scheduleDispatch(storeA, () => {
            logs.push('storeA:re-entrant:dispatch');
          });
          logs.push('storeB:dispatch:end');
        });
        logs.push('storeA:dispatch:end');
      });

      expect(logs).toEqual([
        'storeA:dispatch:start',
        'storeB:dispatch:start',
        'storeB:dispatch:end',
        'storeA:dispatch:end',
        'storeA:re-entrant:dispatch',
      ]);
    });

    it('detects re-entrant dispatch across deep call stacks (A -> B -> C -> A)', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const storeC = { name: 'storeC' };
      const logs: string[] = [];

      TurnScheduler.scheduleDispatch(storeA, () => {
        logs.push('storeA:dispatch:start');
        TurnScheduler.scheduleDispatch(storeB, () => {
          logs.push('storeB:dispatch:start');
          TurnScheduler.scheduleDispatch(storeC, () => {
            logs.push('storeC:dispatch:start');
            TurnScheduler.scheduleDispatch(storeA, () => {
              logs.push('storeA:re-entrant:dispatch');
            });
            logs.push('storeC:dispatch:end');
          });
          logs.push('storeB:dispatch:end');
        });
        logs.push('storeA:dispatch:end');
      });

      expect(logs).toEqual([
        'storeA:dispatch:start',
        'storeB:dispatch:start',
        'storeC:dispatch:start',
        'storeC:dispatch:end',
        'storeB:dispatch:end',
        'storeA:dispatch:end',
        'storeA:re-entrant:dispatch',
      ]);
    });
  });

  describe('Queue Draining & Cascading Tasks', () => {
    it('handles tasks queued during the queue draining phase in FIFO order', () => {
      const store = { name: 'store' };
      const logs: string[] = [];

      TurnScheduler.scheduleEmit(store, () => {
        logs.push('emit:initial');
        TurnScheduler.scheduleDispatch(store, () => {
          logs.push('drain:task1');
          TurnScheduler.scheduleDispatch(store, () => {
            logs.push('drain:task3');
          });
        });
        TurnScheduler.scheduleDispatch(store, () => {
          logs.push('drain:task2');
        });
      });

      expect(logs).toEqual([
        'emit:initial',
        'drain:task1',
        'drain:task2',
        'drain:task3',
      ]);
    });

    it('maintains correct FIFO order across mixed kinds of cascading tasks', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(storeA, () => {
        logs.push('init:A');
        TurnScheduler.scheduleEmit(storeA, () => {
          logs.push('emit:A');
          TurnScheduler.scheduleDispatch(storeA, () => {
            logs.push('dispatch:A');
          });
        });
        TurnScheduler.scheduleEmit(storeB, () => {
          logs.push('emit:B');
        });
      });

      expect(logs).toEqual([
        'init:A',
        'emit:A',
        'emit:B',
        'dispatch:A',
      ]);
    });
  });

  describe('Error Handling and State Recovery', () => {
    it('resets state and re-throws when scheduleInit throws', () => {
      const target = {};
      const error = new Error('Init failed');

      expect(() => {
        TurnScheduler.scheduleInit(target, () => {
          throw error;
        });
      }).toThrow(error);

      let recovered = false;
      TurnScheduler.scheduleDispatch(target, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });

    it('clears pending tasks and resets state when scheduleInit throws after queuing tasks', () => {
      const target = {};
      const error = new Error('Init failed');
      let queuedEmitRan = false;

      expect(() => {
        TurnScheduler.scheduleInit(target, () => {
          TurnScheduler.scheduleEmit(target, () => {
            queuedEmitRan = true;
          });
          throw error;
        });
      }).toThrow(error);

      expect(queuedEmitRan).toBe(false);

      let recovered = false;
      TurnScheduler.scheduleDispatch(target, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });

    it('resets state, clears pending tasks, and re-throws when scheduleEmit throws', () => {
      const target = {};
      const error = new Error('Emit failed');
      let queuedRan = false;

      expect(() => {
        TurnScheduler.scheduleEmit(target, () => {
          TurnScheduler.scheduleDispatch(target, () => {
            queuedRan = true;
          });
          throw error;
        });
      }).toThrow(error);

      expect(queuedRan).toBe(false);

      let recovered = false;
      TurnScheduler.scheduleEmit(target, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });

    it('resets state, clears pending tasks, and re-throws when scheduleDispatch throws', () => {
      const target = {};
      const error = new Error('Dispatch failed');
      let queuedRan = false;

      expect(() => {
        TurnScheduler.scheduleDispatch(target, () => {
          TurnScheduler.scheduleDispatch(target, () => {
            queuedRan = true;
          });
          throw error;
        });
      }).toThrow(error);

      expect(queuedRan).toBe(false);

      let recovered = false;
      TurnScheduler.scheduleDispatch(target, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });

    it('recovers cleanly when a queued task throws during draining', () => {
      const target = {};
      const error = new Error('Draining task failed');
      let secondQueuedTaskRan = false;

      expect(() => {
        TurnScheduler.scheduleEmit(target, () => {
          TurnScheduler.scheduleDispatch(target, () => {
            throw error;
          });
          TurnScheduler.scheduleDispatch(target, () => {
            secondQueuedTaskRan = true;
          });
        });
      }).toThrow(error);

      expect(secondQueuedTaskRan).toBe(false);

      let recovered = false;
      TurnScheduler.scheduleEmit(target, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });

    it('recovers cleanly when a nested synchronous frame throws', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const error = new Error('Nested frame failed');

      expect(() => {
        TurnScheduler.scheduleEmit(storeA, () => {
          TurnScheduler.scheduleEmit(storeB, () => {
            throw error;
          });
        });
      }).toThrow(error);

      let recovered = false;
      TurnScheduler.scheduleEmit(storeA, () => {
        recovered = true;
      });
      expect(recovered).toBe(true);
    });
  });

  describe('Complex Interaction & Reactive Pipeline Simulation', () => {
    it('simulates a complete reactive pipeline preserving RTC semantics', () => {
      const storeA = { name: 'storeA' };
      const storeB = { name: 'storeB' };
      const logs: string[] = [];

      TurnScheduler.scheduleInit(storeB, () => {
        logs.push('storeB:init');
        TurnScheduler.scheduleInit(storeA, () => {
          logs.push('storeA:init');
          TurnScheduler.scheduleEmit(storeA, () => {
            logs.push('storeA:emit:initial');
            TurnScheduler.scheduleEmit(storeB, () => {
              logs.push('storeB:emit:initial');
            });
          });
        });
      });

      expect(logs).toEqual([
        'storeB:init',
        'storeA:init',
        'storeA:emit:initial',
        'storeB:emit:initial',
      ]);

      logs.length = 0;

      TurnScheduler.scheduleDispatch(storeB, () => {
        logs.push('storeB:dispatch:action1');
        TurnScheduler.scheduleDispatch(storeA, () => {
          logs.push('storeA:dispatch:action1');
          TurnScheduler.scheduleEmit(storeA, () => {
            logs.push('storeA:emit:state1');
            TurnScheduler.scheduleEmit(storeB, () => {
              logs.push('storeB:emit:state1');
              TurnScheduler.scheduleDispatch(storeB, () => {
                logs.push('storeB:dispatch:action2');
              });
            });
          });
        });
        logs.push('storeB:dispatch:action1:done');
      });

      expect(logs).toEqual([
        'storeB:dispatch:action1',
        'storeA:dispatch:action1',
        'storeA:emit:state1',
        'storeB:emit:state1',
        'storeB:dispatch:action1:done',
        'storeB:dispatch:action2',
      ]);
    });
  });
});