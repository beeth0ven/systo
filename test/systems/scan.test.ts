import { describe, it } from 'vitest';
import { runSystemTest } from '../test-utils.js';
import { scan } from '../../src/index.js';

describe('Scan', () => {
  it('should accumulate events into state.', async () => {
    await runSystemTest({
      systemFactory: () => scan<string, string>({
        initialState: 'a', 
        reduce: (state, event) => `${state}|${event}`,
      }),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'next', 'a'],
        [20, 'in',  'dispatch', 'b'],
        [20, 'out', 'next', 'a|b'],
        [30, 'in',  'dispatch', 'c'],
        [30, 'out', 'next', 'a|b|c'],
        [40, 'in',  'dispose'],
        [50, 'in',  'dispatch', 'd'],
      ]
    });
  })
});