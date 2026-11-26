import { createSystemEvents } from "./events.js";
import { SystemFactory, TestTimeline } from "./types.js";

type SystemEventsKit<SourceState, SourceEvent, State, Event> = ReturnType<
  typeof createSystemEvents<SourceState, SourceEvent, State, Event>
>;

type SystemTestKitWithFactory<SourceState, SourceEvent, State, Event> =
  & SystemEventsKit<SourceState, SourceEvent, State, Event>
  & { runSystemTest: (timeline: TestTimeline<SourceState, SourceEvent, State, Event>) => Promise<void>, };

type SystemTestKitWithoutFactory<SourceState, SourceEvent, State, Event> =
  & SystemEventsKit<SourceState, SourceEvent, State, Event>
  & { 
    runSystemTest: (
      systemFactory: SystemFactory<SourceState, SourceEvent, State, Event>,
      timeline: TestTimeline<SourceState, SourceEvent, State, Event>,
    ) => Promise<void>,
  };

function setupSystemTest<SourceState, SourceEvent, State = SourceState, Event = SourceEvent>(
  systemFactory: SystemFactory<SourceState, SourceEvent, State, Event>,
): SystemTestKitWithFactory<SourceState, SourceEvent, State, Event>;

function setupSystemTest<SourceState, SourceEvent, State = SourceState, Event = SourceEvent>(
): SystemTestKitWithoutFactory<SourceState, SourceEvent, State, Event>;

function setupSystemTest<SourceState, SourceEvent, State = SourceState, Event = SourceEvent>(
  systemFactory?: SystemFactory<SourceState, SourceEvent, State, Event>,
) {
  return {
    ...createSystemEvents<SourceState, SourceEvent, State, Event>(),
    runSystemTest: async () => {
      throw new Error(`Not implemented with ${systemFactory}`);
    },
  };
}

export {
  SystemEventsKit,
  SystemTestKitWithFactory,
  SystemTestKitWithoutFactory,
  setupSystemTest,
}
