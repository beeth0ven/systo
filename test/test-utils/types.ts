import { EventOrEvents, Store, System } from "../../src/core.js";

type ObserveInput                       = { readonly type: 'observe' };
type Observe2Input                      = { readonly type: 'observe2' };
type DispatchInput<Event>               = { readonly type: 'dispatch'; event: EventOrEvents<Event> };
type Dispatch2Input<Event>              = { readonly type: 'dispatch2'; event: EventOrEvents<Event> };
type DisposeInput                       = { readonly type: 'dispose' };
type Dispose2Input                      = { readonly type: 'dispose2' };

type SourceObserveOutput                = { readonly type: 'source.observe' };
type SourceObserve2Output               = { readonly type: 'source.observe2' };
type SourceDispatchOutput<SourceEvent>  = { readonly type: 'source.dispatch'; event: EventOrEvents<SourceEvent> };
type SourceDispatch2Output<SourceEvent> = { readonly type: 'source.dispatch2'; event: EventOrEvents<SourceEvent> };
type SourceDisposeOutput                = { readonly type: 'source.dispose' };
type SourceDispose2Output               = { readonly type: 'source.dispose2' };

type SourceNextInput<SourceState>       = { readonly type: 'source.next'; state: SourceState };
type SourceNext2Input<SourceState>      = { readonly type: 'source.next2'; state: SourceState };

type NextOutput<State>                  = { readonly type: 'next'; state: State };
type Next2Output<State>                 = { readonly type: 'next2'; state: State };
type LogOutput                          = { readonly type: 'log'; message: string };

type DownstreamInput<Event> = 
  | ObserveInput
  | Observe2Input
  | DispatchInput<Event>
  | Dispatch2Input<Event>
  | DisposeInput
  | Dispose2Input;

type EmittingSourceOutput<SourceEvent> =
  | SourceObserveOutput
  | SourceObserve2Output
  | SourceDispatchOutput<SourceEvent>
  | SourceDispatch2Output<SourceEvent>;

type NonEmittingSourceOutput =
  | SourceDisposeOutput
  | SourceDispose2Output;

type SourceOutput<SourceEvent> =
  | EmittingSourceOutput<SourceEvent>
  | NonEmittingSourceOutput;

type SourceInput<SourceState> =
  | SourceNextInput<SourceState>
  | SourceNext2Input<SourceState>;

type DownstreamOutput<State> =
  | NextOutput<State>
  | Next2Output<State>
  | LogOutput;

type Input<SourceState, Event> =
  | DownstreamInput<Event>
  | SourceInput<SourceState>;

type Output<SourceEvent, State> =
  | SourceOutput<SourceEvent>
  | DownstreamOutput<State>;

type ScenarioEvent<State, Event> =
  | DownstreamInput<Event>
  | DownstreamOutput<State>;

type SourceEmission<SourceState> = { readonly emit: SourceState };

type TestEvent<SourceState, SourceEvent, State = SourceState, Event = SourceEvent> =
  | Input<SourceState, Event>
  | (EmittingSourceOutput<SourceEvent> & { readonly emission?: SourceEmission<SourceState> })
  | NonEmittingSourceOutput
  | DownstreamOutput<State>;

type Timeline<T> = Record<number, T[]>;
type InputTimeline<SourceState, Event> = Timeline<Input<SourceState, Event>>;
type OutputTimeline<SourceEvent, State> = Timeline<Output<SourceEvent, State>>;
type ScenarioTimeline<State, Event> = Timeline<ScenarioEvent<State, Event>>;
type TestTimeline<SourceState, SourceEvent, State = SourceState, Event = SourceEvent> = Timeline<TestEvent<SourceState, SourceEvent, State, Event>>;

type Log = (message: string) => void;
type GetStore<State, Event> = (target?: 1 | 2) => Store<State, Event> | undefined;

type SystemFactory<SourceState, SourceEvent, State = SourceState, Event = SourceEvent> = (
  mockSource: System<SourceState, SourceEvent>,
  log: Log,
  getStore: GetStore<State, Event>,
) => System<State, Event>;

type ScenarioSystem<State, Event> =
  | System<State, Event>
  | ((log: Log, getStore: GetStore<State, Event>) => System<State, Event>);

export { 
  ObserveInput,
  Observe2Input,
  DispatchInput,
  Dispatch2Input,
  DisposeInput,
  Dispose2Input,
  SourceObserveOutput,
  SourceObserve2Output,
  SourceDispatchOutput,
  SourceDispatch2Output,
  SourceDisposeOutput,
  SourceDispose2Output,
  SourceNextInput,
  SourceNext2Input,
  NextOutput,
  Next2Output,
  LogOutput,
  DownstreamInput,
  EmittingSourceOutput,
  NonEmittingSourceOutput,
  SourceOutput,
  SourceInput,
  DownstreamOutput,
  Input,
  Output,
  ScenarioEvent,
  SourceEmission,
  TestEvent,
  Timeline,
  InputTimeline,
  OutputTimeline,
  ScenarioTimeline,
  TestTimeline,
  Log,
  GetStore,
  SystemFactory,
  ScenarioSystem
};