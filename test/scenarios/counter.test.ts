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
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'next', 0],

        [20, 'in',  'dispatch', 'increment'],
        [20, 'out', 'next', 1],

        [30, 'in',  'dispatch', 'increment'],
        [30, 'out', 'next', 2],

        [40, 'in',  'dispatch', 'decrement'],
        [40, 'out', 'next', 1],

        [50, 'in',  'dispose'],
        
        [60, 'in',  'dispatch', 'increment'],
      ],
    })
  })
});