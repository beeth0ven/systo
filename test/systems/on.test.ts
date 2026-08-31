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
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'log', 'init'],
        [10, 'out', 'source.observe'],
        [10, 'in',  'source.next', 'a'],
        [10, 'out', 'log', 'next: a'],
        [10, 'out', 'next', 'a'],
        [20, 'in',  'dispatch', 'b'],
        [20, 'out', 'log', 'dispatch: b'],
        [20, 'out', 'source.dispatch', 'b'],
        [20, 'in',  'source.next', 'a|b'],
        [20, 'out', 'log', 'next: a|b'],
        [20, 'out', 'next', 'a|b'],
        [30, 'in',  'dispose'],
        [30, 'out', 'log', 'dispose'],
        [30, 'out', 'source.dispose'],
        [40, 'in',  'dispatch', 'c'],
      //[40, 'out', 'log', 'dispatch: c']   --- IGNORE after disposal ---
      //[40, 'out', 'source.dispatch', 'c'] --- IGNORE after disposal ---
        [50, 'in',  'source.next', 'a|b|c'],
      //[50, 'out', 'log', 'next: a|b|c']   --- IGNORE after disposal ---
      //[50, 'out', 'next', 'a|b|c']        --- IGNORE after disposal ---
        [60, 'in',  'dispose'],
      //[60, 'out', 'log', 'dispose']       --- IGNORE after disposal ---
      //[60, 'out', 'source.dispose']       --- IGNORE after disposal ---
      ],
    });
  });
});