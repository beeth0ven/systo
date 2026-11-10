import { describe, it } from "vitest";
import { runScenario } from "../../test-utils.js";
import { scan } from "../../../src/index.js";

describe('Scenario: Counter', () => {
  type State = number;
  type Event = 
    | 'increment'
    | 'decrement';

  const system = scan<State, Event>({
    initialState: 0,
    reduce: (state, event) => {
      switch (event) {
        case 'increment':
          return state + 1;
        case 'decrement':
          return state - 1;
      }
    },
  });

  it('should test event dispatches and state update', async () => {
    await runScenario(system, {
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
        // Ignore after disposal
      ],
    });
  });
});
