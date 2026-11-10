import { describe, it } from "vitest";
import { runScenario } from "../../test-utils.js";
import { pipe, react, scan } from "../../../src/index.js";

describe('Scenario: Github Search', () => {
  type State = {
    query: string;
    status: 'idle' | 'loading' | 'success';
    results: string[];
  };
  
  type Event =
    | { type: 'input'; query: string }
    | { type: 'response'; results: string[] };

  const system = pipe(
    scan<State, Event>({
      initialState: {
        query: '',
        status: 'idle',
        results: [],
      },
      reduce: (state, event) => {
        switch (event.type) {
          case 'input':
            return {
              query: event.query,
              status: event.query ? 'loading' : 'idle',
              results: [],
            };
          case 'response':
            return {
              query: state.query,
              status: 'success',
              results: event.results,
            };
        }
      },
    }),
    react({
      request: (state) => state.status === 'loading' ? state.query : undefined,
      effect: (request, dispatch) => {
        const timerId = setTimeout(() => {
          dispatch({ type: 'response', results: [`${request}-repo`]});
        }, 20);
        return () => clearTimeout(timerId);
      },
    })
  );

  it('should search repositories with feedback loop and cancellation', async () => {
    await runScenario(system, {
      10: [
        ['observe'],
        ['next', { query: '', status: 'idle', results: [] }],
      ],
      20: [
        ['dispatch', { type: 'input', query: 'react' }],
        ['next', { query: 'react', status: 'loading', results: [] }],
      ],
      40: [
        ['next', { query: 'react', status: 'success', results: ['react-repo'] }],
      ],
      50: [
        ['dispatch', { type: 'input', query: 'vue' }],
        ['next', { query: 'vue', status: 'loading', results: [] }],
      ],
      60: [
        ['dispatch', { type: 'input', query: 'systo' }],
        ['next', { query: 'systo', status: 'loading', results: [] }],
      ],
      80: [
        ['next', { query: 'systo', status: 'success', results: ['systo-repo'] }],
      ],
      90: [
        ['dispose'],
      ],
    });
  });
});
