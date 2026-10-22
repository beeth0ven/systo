import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { scan } from "../../src/index.js";

type CounterState = number;
type CounterEvent = 
  | 'increment'
  | 'decrement';

describe('Requirement: Counter', () => {
  it('should test event dispatches and state update', async () => {
    await runSystemTest({
      systemFactory: () => scan<CounterState, CounterEvent>({
        initialState: 0,
        reduce: (state, event) => {
          switch (event) {
            case 'increment':
              return state + 1;
            case 'decrement':
              return state - 1;
          }
        },
      }),
      events: {
        10: [
          ['observe'],
          ['next', 0],
        ],
        20: [
          ['dispatch', 'increment'],
          ['next', 1],
        ],
        30: [
          ['dispatch', 'increment'],
          ['next', 2],
        ],
        40: [
          ['dispatch', 'decrement'],
          ['next', 1],
        ],
        50: [
          ['dispose'],
        ],
        60: [
          ['dispatch', 'increment'],
          // ['next', 2], --- IGNORE after disposal ---
        ]
      },
    });
  });
});