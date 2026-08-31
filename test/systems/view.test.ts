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
        events: [
          // 1. Observe: connects to the source and awaits the initial source state
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],

          // 2. Source emits initial state -> View combines with initial local state
          [10, 'in',  'source.next', { count: 0 }],
          [10, 'out', 'next', { count: 0, isEditing: false }],

          // 3. Single local event
          [20, 'in',  'dispatch', 'toggleEdit'],
          [20, 'out', 'next', { count: 0, isEditing: true }],

          // 4. Single source event: forwarded as array to source
          [30, 'in',  'dispatch', 'increment'],
          [30, 'out', 'source.dispatch', ['increment']],
          
          // 5. Source updates
          [30, 'in',  'source.next', { count: 1 }],
          [30, 'out', 'next', { count: 1, isEditing: true }],
          
          // 6. Batch Dispatch: mixed local and source events in one all
          // -> Both executed, source events send together
          [40, 'in',  'dispatch', ['increment', 'increment', 'toggleEdit']],
          [40, 'out', 'source.dispatch', ['increment', 'increment']],
          
          // 7. Source responds to the batch increment
          [40, 'in',  'source.next', { count: 3 }],
          [40, 'out', 'next', { count: 3, isEditing: false }],

          // 8. Disposal
          [50, 'in',  'dispose'],
          [50, 'out', 'source.dispose'],

          // 9. Ignore after disposal
          [60, 'in',  'dispatch', 'toggleEdit'],
          [70, 'in',  'source.next', { count: 4 }],
        ],
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
        events: [
          // 1. Observe: connects to the source and awaits the initial source state
          [10, 'in',  'observe'],
          [10, 'out', 'source.observe'],

          // 2. Source emits initial state -> View combines with initial local state
          [10, 'in',  'source.next', { savedMessages: [] }],
          [10, 'out', 'next', { savedMessages: [], buffer: '' }],
          
          // 3. Sequential local events (tokens)
          [20, 'in',  'dispatch', { type: 'token', chunk: 'Hello' }],
          [20, 'out', 'next', { savedMessages: [], buffer: 'Hello' }],

          [30, 'in',  'dispatch', { type: 'token', chunk: ' World' }],
          [30, 'out', 'next', { savedMessages: [], buffer: 'Hello World' }],

          // 4. Batch dispatches
          [40, 'in',  'dispatch', [
            { type: 'token', chunk: '!' },
            { type: 'token', chunk: ' 🚀' },
            { type: 'submit' },
          ]],
          [40, 'out', 'source.dispatch', [{ type: 'commit', message: 'Hello World! 🚀' }]],

          // 5. Source responds to the commit
          [40, 'in',  'source.next', { savedMessages: ['Hello World! 🚀'] }],
          [40, 'out', 'next', { savedMessages: ['Hello World! 🚀'], buffer: '' }],
        ],
      });
    });
  });
});