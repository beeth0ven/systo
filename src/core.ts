declare const StateBrand: unique symbol;

interface Disposable {
  dispose(): void;
}

interface Observer<Value> {
  next(value: Value): void;
}

interface Observable<Value> {
  observe(observer: Observer<Value>): Disposable;
}

interface Dispatcher<Event> {
  dispatch(event: Event | readonly Event[]): void;
}

interface Store<out State, in Event = never> extends Disposable, Dispatcher<Event> {
  [StateBrand]?: State;
}

interface System<out State, in Event = never> {
  observe(observer: Observer<State>): Store<State, Event>;
}

type Operator<SourceState, SourceEvent, State = SourceState, Event = SourceEvent> = (
  source: System<SourceState, SourceEvent>,
) => System<State, Event>;

type DisposableLike = Disposable | (() => void);
type Teardown = DisposableLike | void;

export {
  Disposable,
  Observer,
  Observable,
  Dispatcher,
  Store,
  System,
  Operator,
  DisposableLike,
  Teardown,
};
