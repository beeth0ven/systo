import { EventOrEvents } from '../core.js';

function applyReduce<State, Event>(
  reduce: (state: State, event: Event) => State,
  state: State,
  event: EventOrEvents<Event>,
) {
  if (Array.isArray(event)) {
    return event.reduce((s, e) => reduce(s, e), state);
  }
  return reduce(state, event as Event);
}

export { applyReduce };
