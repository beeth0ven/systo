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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- State is required for structural consistency but not used inside the interface body
interface Store<State, Event> extends Disposable, Dispatcher<Event> {}

interface System<State, Event> {
  observe(observer: Observer<State>): Store<State, Event>;
}

type Operator<State, Event, SourceState = State, SourceEvent = Event> = (
  source: System<SourceState, SourceEvent>,
) => System<State, Event>;

export { Disposable, Observer, Observable, Dispatcher, Store, System, Operator };
