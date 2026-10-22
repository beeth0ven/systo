import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { pipe, share } from "../../src/index.js";

describe('Share', () => {
  it('should act as a standard 1:1 pipeline for single current store', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: {
        10: [
          ['observe'],
          ['source.observe'],
          ['source.next', 'a'],
          ['next', 'a'],
        ],
        20: [
          ['dispatch', 'b'],
          ['source.dispatch', 'b'],
        ],
        30: [
          ['dispose'],
          ['source.dispose'],
        ],
      },
    });
  });

  it('should share single source store, multicast, and replay latest state to late current stores', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: {
        10: [
          ['observe'],
          ['source.observe'],
          ['source.next', 'a'],
          ['next', 'a'],
        ],
        20: [
          ['observe2'],
          ['next2', 'a'],
        ],
        30: [
          ['source.next', 'a|b'],
          ['next', 'a|b'],
          ['next2', 'a|b'],
        ],
        40: [
          ['dispose'],
        ],
        50: [
          ['source.next', 'a|b|c'],
          ['next2', 'a|b|c'],
        ],
        60: [
          ['dispose2'],
          ['source.dispose'],
        ],
      },
    });
  });

  it('should route event dispatches from current stores to source store', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: {
        10: [
          ['observe'],
          ['source.observe'],
          ['source.next', 'a'],
          ['next', 'a'],
        ],
        20: [
          ['observe2'],
          ['next2', 'a'],
        ],
        30: [
          ['dispatch', 'b'],
          ['source.dispatch', 'b'],
        ],
        40: [
          ['dispatch2', 'c'],
          ['source.dispatch', 'c'],
        ],
        50: [
          ['dispose'],
        ],
        60: [
          ['dispose2'],
          ['source.dispose'],
        ],
      },
    });
  });

  it('should manage source store lifecycle using references count of current stores', async () => {
    await runSystemTest({
      systemFactory: (mockSource) => pipe(mockSource, share()),
      events: {
        10: [
          ['observe'],
          ['source.observe'],
          ['source.next', 'a'],
          ['next', 'a'],
        ],
        20: [
          ['dispose'],
          ['source.dispose'],
        ],
        30: [
          ['observe2'],
          ['source.observe2'],
          ['source.next2', 'a'],
          ['next2', 'a'],
        ],
        40: [
          ['dispose2'],
          ['source.dispose2'],
        ],
      },
    });
  });
});