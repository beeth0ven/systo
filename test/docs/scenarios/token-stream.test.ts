import { describe, it } from "vitest";
import { pipe, scan, view } from "../../../src/index.js";
import { runScenario } from "../../test-utils.js";

describe('Scenario: Token Stream', () => {
  type SourceState = {
    messages: string[];
  };

  type SourceEvent = 
    | { type: 'commit', message: string };
  
  type LocalState = {
    buffer: string;
  };

  type LocalEvent =
    | { type: 'token', chunk: string }
    | { type: 'clear' };

  type State = {
    savedMessages: string[];
    buffer: string;
  };
  
  type Event = LocalEvent | { type: 'submit' };

  const system = pipe(
    scan<SourceState, SourceEvent>({
      initialState: { messages: [] },
      reduce: (state, event) => ({
        messages: [...state.messages, event.message],
      }),
    }),
    view<SourceState, SourceEvent, LocalState, LocalEvent, State, Event>({
      initialLocalState: { buffer: '' },
      combineState: (sourceState, localState) => ({
        savedMessages: sourceState.messages,
        buffer: localState.buffer,
      }),
      mapEvent: (event, localState) => {
        switch (event.type) {
          case 'token':
          case 'clear':
            return { local: event };
          case 'submit':
            return { 
              source: { type: 'commit', message: localState.buffer }, 
              local: { type: 'clear' } 
            };
        }
      },
      reduceLocal: (localState, localEvent) => {
        switch (localEvent.type) {
          case 'token':
            return { buffer: localState.buffer + localEvent.chunk };
          case 'clear':
            return { buffer: '' };
        }
      },
    }),
  );
  
  it('should accumulate local state sequentially during batching and forward accumulated result', async () => {
    await runScenario(system, {
      10: [
        ['observe'],
        ['next', { savedMessages: [], buffer: '' }],
      ],
      20: [
        ['dispatch', { type: 'token', chunk: 'Hello' }],
        ['next', { savedMessages: [], buffer: 'Hello' }],
      ],
      30: [
        ['dispatch', { type: 'token', chunk: ' World' }],
        ['next', { savedMessages: [], buffer: 'Hello World' }],
      ],
      40: [
        ['dispatch', [
          { type: 'token', chunk: '!' },
          { type: 'token', chunk: ' 🚀' },
          { type: 'submit' },
        ]],
        ['next', { savedMessages: ['Hello World! 🚀'], buffer: '' }],
      ],
    });
  });
});
