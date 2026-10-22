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

    type State = LocalState & SourceState;
    type Event = LocalEvent | SourceEvent; 

    it('should handle single and batch dispatches correctly', async () => {
      await runSystemTest<State, Event, SourceState, SourceEvent>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          view({
            initialLocalState: { isEditing: false } as LocalState,
            combineState: (localState, sourceState) => ({ ...localState, ...sourceState }),
            reduceLocal: (localState, event) => {
              switch (event) {
                case 'toggleEdit':
                  return { isEditing: !localState.isEditing };
                default:
                  return localState;
              }
            },
            toSourceEvent: (event) => {
              switch (event) {
                case 'increment':
                case 'decrement':
                  return event;
                default:
                  return undefined;
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

    type State = LocalState & SourceState;
    type Event = LocalEvent | { type: 'submit' };

    it('should accumulate local state sequentially during batching and forward accumulated result', async () => {
      await runSystemTest<State, Event, SourceState, SourceEvent>({
        systemFactory: (mockSource) => pipe(
          mockSource,
          view({
            initialLocalState: { buffer: '' } as LocalState,
            combineState: (localState, sourceState) => ({ ...localState, ...sourceState }),
            reduceLocal: (localState, event) => {
              switch (event.type) {
                case 'token':
                  return { buffer: localState.buffer + event.chunk };
                case 'clear':
                case 'submit':
                  return { buffer: '' };
                default:
                  return localState;
              }
            },
            toSourceEvent: (event, localState) => {
              switch (event.type) {
                case 'submit':
                  return { type: 'commit', message: localState.buffer };
                default:
                  return undefined;
              }
            },
          })
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