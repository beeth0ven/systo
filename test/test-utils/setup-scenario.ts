import { createScenarioEvents } from "./events.js";
import { ScenarioSystem, ScenarioTimeline } from "./types.js";

type ScenarioEventsKit<State, Event> = ReturnType<typeof createScenarioEvents<State, Event>>;

type ScenarioTestKit<State, Event> = 
  & ScenarioEventsKit<State, Event>
  & { runScenario: (timeline: ScenarioTimeline<State, Event>) => Promise<void>, }

function setupScenario<State, Event>(
  system: ScenarioSystem<State, Event>
): ScenarioTestKit<State, Event> {
  return {
    ...createScenarioEvents<State, Event>(),
    runScenario: async () => {
      throw new Error(`Not implemented with system: ${system}.`);
    },
  };
}

export {
  ScenarioEventsKit,
  ScenarioTestKit, 
  setupScenario 
};
