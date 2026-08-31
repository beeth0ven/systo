import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { pipe, share } from "../../src/index.js";

describe('Share', () => {
  it('should act as a standard 1:1 pipeline for single current store', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'source.observe'],
        [10, 'in',  'source.next', 'a'],
        [10, 'out', 'next', 'a'],

        [20, 'in',  'dispatch', 'b'],
        [20, 'out', 'source.dispatch', 'b'],

        [30, 'in',  'dispose'],
        [30, 'out', 'source.dispose'],
      ],
    });
  });

  it('should share single source store, multicast, and replay latest state to late current stores', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'source.observe'],
        [10, 'in',  'source.next', 'a'],
        [10, 'out', 'next', 'a'],

        [20, 'in',  'observe2'],
        [20, 'out', 'next2', 'a'],

        [30, 'in',  'source.next', 'a|b'],
        [30, 'out', 'next', 'a|b'],
        [30, 'out', 'next2', 'a|b'],
        
        [40, 'in',  'dispose'],

        [50, 'in',  'source.next', 'a|b|c'],
        [50, 'out', 'next2', 'a|b|c'],

        [60, 'in',  'dispose2'],
        [60, 'out', 'source.dispose'],
      ],
    });
  });

  it('should route event dispatches from current stores to source store', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'source.observe'],
        [10, 'in',  'source.next', 'a'],
        [10, 'out', 'next', 'a'],

        [20, 'in',  'observe2'],
        [20, 'out', 'next2', 'a'],

        [30, 'in',  'dispatch', 'b'],
        [30, 'out', 'source.dispatch', 'b'],

        [40, 'in',  'dispatch2', 'c'],
        [40, 'out', 'source.dispatch', 'c'],

        [50, 'in',  'dispose'],
        [60, 'in',  'dispose2'],
        [60, 'out', 'source.dispose'],
      ],
    });
  });

  it('should manage source store lifecycle using references count of current stores', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'source.observe'],
        [10, 'in',  'source.next', 'a'],
        [10, 'out', 'next', 'a'],

        [20, 'in',  'dispose'],
        [20, 'out', 'source.dispose'],

        [30, 'in',  'observe2'],
        [30, 'out', 'source.observe'],
        [30, 'in',  'source.next', 'a'],
        [30, 'out', 'next2', 'a'],

        [40, 'in',  'dispose2'],
        [40, 'out', 'source.dispose'],
      ],
    });
  });
});