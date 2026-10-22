import { describe, it } from 'vitest';
import { runSystemTest } from '../test-utils.js';
import { on, pipe } from '../../src/index.js';

describe('On', () => {
  it('should call init, next, dispatch, and dispose callbacks', async () => {
    await runSystemTest({
      systemFactory: (mockSource, log) => pipe(
        mockSource,
        on({
          init: () => log('init'),
          next: (state) => log(`next: ${state}`),
          dispatch: (event) => log(`dispatch: ${event}`),
          dispose: () => log('dispose'),
        }),
      ),
      events: {
        10: [
          ['observe'],
          ['log', 'init'],
          ['source.observe'],
          ['source.next', 'a'],
          ['log', 'next: a'],
          ['next', 'a'],
        ],
        20: [
          ['dispatch', 'b'],
          ['log', 'dispatch: b'],
          ['source.dispatch', 'b'],
          ['source.next', 'a|b'],
          ['log', 'next: a|b'],
          ['next', 'a|b'],
        ],
        30: [
          ['dispose'],
          ['log', 'dispose'],
          ['source.dispose'],
        ],
        40: [
          ['dispatch', 'c'],
          // ['log', 'dispatch: c'],    --- IGNORE after disposal ---
          // ['source.dispatch', 'c'],  --- IGNORE after disposal ---
        ],
        50: [
          ['source.next', 'a|b|c'],
          // ['log', 'next: a|b|c'],    --- IGNORE after disposal ---
          // ['next', 'a|b|c'],         --- IGNORE after disposal ---
        ],
        60: [
          ['dispose'],
          // ['log', 'dispose'],        --- IGNORE after disposal ---
          // ['source.dispose'],        --- IGNORE after disposal ---
        ]
      },
    });
  });
});