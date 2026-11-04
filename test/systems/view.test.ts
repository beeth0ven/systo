import { describe, it } from "vitest";
import { runSystemTest } from "../test-utils.js";
import { pipe, view } from "../../src/index.js";

describe('View', () => {
  describe('Basic & Array Dispatching', () => {
    type SourceState = {
      count: number;
    };

    type SourceEvent = 
      | 'increment'
      | 'decrement';

    type LocalState = {
      isEditing: boolean;
    };

    type LocalEvent =
      | 'toggleEdit';

    type State = SourceState & LocalState;
    type Event = SourceEvent | LocalEvent; 

    it('should handle single and batch dispatches correctly', async () => {
      await runSystemTest<SourceState, SourceEvent, State, Event>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          view<SourceState, SourceEvent, LocalState, LocalEvent>({
            initialLocalState: { isEditing: false },
            mapEvent: (event) => {
              switch (event) {
                case 'increment':
                case 'decrement':
                  return { source: event };
                case 'toggleEdit':
                  return { local: event };
              }
            },
            reduceLocal: (localState, localEvent) => {
              switch (localEvent) {
                case 'toggleEdit':
                  return { isEditing: !localState.isEditing };
              }
            },
          })
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { count: 0 }],
            ['next', { count: 0, isEditing: false }],
          ],
          20: [
            ['dispatch', 'toggleEdit'],
            ['next', { count: 0, isEditing: true }],
          ],
          30: [
            ['dispatch', 'increment'],
            ['source.dispatch', ['increment']],
            ['source.next', { count: 1 }],
            ['next', { count: 1, isEditing: true }],
          ],
          40: [
            ['dispatch', ['increment', 'increment', 'toggleEdit']],
            ['source.dispatch', ['increment', 'increment']],
            ['source.next', { count: 3 }],
            ['next', { count: 3, isEditing: false }],
          ],
          50: [
            ['dispose'],
            ['source.dispose'],
          ],
          60: [
            ['dispatch', 'toggleEdit'],
          ],
          70: [
            ['source.next', { count: 4 }],
          ],
        },
      });
    });
  });

  describe('Sequential Batching Accumulation (Token Stream & Commit)', () => {
    type SourceState = {
      savedMessages: string[];
    };

    type SourceEvent = 
      | { type: 'commit', message: string };
    
    type LocalState = {
      buffer: string;
    };

    type LocalEvent =
      | { type: 'token', chunk: string }
      | { type: 'clear' };

    type State = SourceState & LocalState;
    type Event = LocalEvent | { type: 'submit' };

    it('should accumulate local state sequentially during batching and forward accumulated result', async () => {
      await runSystemTest<SourceState, SourceEvent, State, Event>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          view<SourceState, SourceEvent, LocalState, LocalEvent, State, Event>({
            initialLocalState: { buffer: '' },
            combineState: (sourceState, localState) => ({ ...sourceState, ...localState }),
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
            }
          }),
        ),
        events: {
          10: [
            ['observe'],
            ['source.observe'],
            ['source.next', { savedMessages: [] }],
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
            ['source.dispatch', [{ type: 'commit', message: 'Hello World! 🚀' }]],
            ['source.next', { savedMessages: ['Hello World! 🚀'] }],
            ['next', { savedMessages: ['Hello World! 🚀'], buffer: '' }],
          ]
        },
      });
    });
  });
});