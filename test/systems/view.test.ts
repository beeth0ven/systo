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
});