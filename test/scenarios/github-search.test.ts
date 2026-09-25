import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { pipe, react, scan } from "../../src/index.js";

type GithubSearchState = {
  query: string;
  status: 'idle' | 'loading' | 'success';
  results: string[];
};

type GithubSearchEvent =
  | { type: 'input'; query: string }
  | { type: 'response'; results: string[] };

describe('Requirement: Github Search', () => {
  it('should search repositories with feedback loop and cancellation', async () => {
    await runSystemTest({
      systemFactory: () => pipe(
        scan<GithubSearchState, GithubSearchEvent>({
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
        react<string, GithubSearchState, GithubSearchEvent>({
          request: (state) => state.status === 'loading' ? state.query : undefined,
          effect: (request, dispatch) => {
            const timerId = setTimeout(() => {
              dispatch({ type: 'response', results: [`${request}-repo`]});
            }, 20);
            return () => clearTimeout(timerId);
          },
        })
      ),
      events: [
        [10, 'in',  'observe'],
        [10, 'out', 'next', { query: '', status: 'idle', results: [] }],

        [20, 'in',  'dispatch', { type: 'input', query: 'react' }],
        [20, 'out', 'next', { query: 'react', status: 'loading', results: [] }],

        [40, 'out', 'next', { query: 'react', status: 'success', results: ['react-repo'] }],

        [50, 'in',  'dispatch', { type: 'input', query: 'vue' }],
        [50, 'out', 'next', { query: 'vue', status: 'loading', results: [] }],

        [60, 'in',  'dispatch', { type: 'input', query: 'systo' }],
        [60, 'out', 'next', { query: 'systo', status: 'loading', results: [] }],

        [80, 'out', 'next', { query: 'systo', status: 'success', results: ['systo-repo'] }],

        [90, 'in',  'dispose'],
      ],
    })
  });
});