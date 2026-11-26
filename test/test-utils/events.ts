import { EventOrEvents } from '../../src/core.js';
import { 
  Dispatch2Input,
  DispatchInput,
  Dispose2Input,
  DisposeInput,
  SourceEmission,
  LogOutput,
  Next2Output,
  NextOutput,
  Observe2Input,
  ObserveInput,
  SourceDispatch2Output,
  SourceDispatchOutput,
  SourceDispose2Output,
  SourceDisposeOutput,
  SourceNext2Input,
  SourceNextInput,
  SourceObserve2Output,
  SourceObserveOutput
} from './types.js';

function createScenarioEvents<State, Event>() {
  return {
    observe:    (): ObserveInput =>                                     ({ type: 'observe' }),
    observe2:   (): Observe2Input =>                                    ({ type: 'observe2' }),
    dispatch:   (event: EventOrEvents<Event>): DispatchInput<Event> =>  ({ type: 'dispatch', event }),
    dispatch2:  (event: EventOrEvents<Event>): Dispatch2Input<Event> => ({ type: 'dispatch2', event}),
    dispose:    (): DisposeInput =>                                     ({ type: 'dispose' }),
    dispose2:   (): Dispose2Input =>                                    ({ type: 'dispose2'  }),
    next:       (state: State): NextOutput<State> =>                    ({ type: 'next', state }),
    next2:      (state: State): Next2Output<State> =>                   ({ type: 'next2', state }),
    log:        (message: string): LogOutput =>                         ({ type: 'log', message }),
  };
}

function createSystemEvents<SourceState, SourceEvent, State = SourceState, Event = SourceEvent>() {
  return {
    ...createScenarioEvents<State, Event>(),
    source: {
      observe: (
        emission?: SourceEmission<SourceState>,
      ): SourceObserveOutput & { emission?: SourceEmission<SourceState> } => 
        ({ type: 'source.observe', ...(emission && { emission }) }),
      observe2: (
        emission?: SourceEmission<SourceState>
      ): SourceObserve2Output & { emission?: SourceEmission<SourceState>} => 
        ({ type: 'source.observe2', ...(emission && { emission }) }),
      dispatch: (
        event: EventOrEvents<SourceEvent>,
        emission?: SourceEmission<SourceState>,
      ): SourceDispatchOutput<SourceEvent> & { emission?: SourceEmission<SourceState> } => 
        ({ type: 'source.dispatch', event, ...(emission && { emission }) }),
      dispatch2: (
        event: EventOrEvents<SourceEvent>,
        emission?: SourceEmission<SourceState>,
      ): SourceDispatch2Output<SourceEvent> & { emission?: SourceEmission<SourceState> }=> 
        ({ type: 'source.dispatch2', event, ...(emission && { emission }) }),
      dispose: (): SourceDisposeOutput => ({ type: 'source.dispose' }),
      dispose2: (): SourceDispose2Output => ({ type: 'source.dispose2' }),
      next: (state: SourceState): SourceNextInput<SourceState> => ({ type: 'source.next', state }),
      next2: (state: SourceState): SourceNext2Input<SourceState> => ({ type: 'source.next2', state }),
    },
  };
}

export {
  createScenarioEvents,
  createSystemEvents,
}