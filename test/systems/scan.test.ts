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
      events: {
        10: [
          ['observe'],
          ['next', 'a'],
        ],
        20: [
          ['dispatch', 'b'],
          ['next', 'a|b'],
        ],
        30: [
          ['dispatch', 'c'],
          ['next', 'a|b|c'],
        ],
        40: [
          ['dispose'],
        ],
        50: [
          ['dispatch', 'd'],
          // ['next', 'a|b|c|d'], --- IGNORE after disposal ---
        ]
      },
    });
  })
});