import { EventOrEvents, Observer, Operator } from '../core.js';
import { BasePipeStore, BasePipeSystem } from './base-pipe.js';

interface ViewEvent<SourceEvent, LocalEvent> {
  source?: SourceEvent;
  local?: LocalEvent;
}

interface BaseViewConfig<SourceState, SourceEvent, LocalState, LocalEvent, State, Event> {
  /**
   * The initial local state.
   */
  initialLocalState: LocalState;

  /**
   * Combine source state and local state into the final State.
   * Optional when `State` is `SourceState & LocalState`.
   * Defaults to `(sourceState, localState) => ({ ...sourceState, ...localState })`.
   */
  combineState?: (sourceState: SourceState, localState: LocalState) => State;

  /**
   * Event Router:
   * Maps an incoming `Event` (with current `LocalState`) to `source` and/or `local` events.
   * If an event affects both source and local (e.g., optimistic update),
   * both `source` and `local` can be returned.
   */
  mapEvent: (event: Event, localState: LocalState) => ViewEvent<SourceEvent, LocalEvent>;

  /**
   * Local Reducer:
   * Strictly handles `LocalEvent` to return updated local state.
   */
  reduceLocal: (localState: LocalState, localEvent: LocalEvent) => LocalState;
}

type ViewConfig<
  SourceState,
  SourceEvent,
  LocalState,
  LocalEvent,
  State = SourceState & LocalState,
  Event = SourceEvent | LocalEvent,
> = BaseViewConfig<SourceState, SourceEvent, LocalState, LocalEvent, State, Event> &
  ([SourceState & LocalState] extends [State]
    ? unknown
    : {
        combineState: (sourceState: SourceState, localState: LocalState) => State;
      });

function view<
  SourceState,
  SourceEvent,
  LocalState,
  LocalEvent,
  State = SourceState & LocalState,
  Event = SourceEvent | LocalEvent,
>(
  config: ViewConfig<SourceState, SourceEvent, LocalState, LocalEvent, State, Event>,
): Operator<SourceState, SourceEvent, State, Event> {
  return (source) => new View({ ...config, source });
}

class View<
  SourceState,
  SourceEvent,
  LocalState,
  LocalEvent,
  State = SourceState & LocalState,
  Event = SourceEvent | LocalEvent,
> extends BasePipeSystem<
  ViewConfig<SourceState, SourceEvent, LocalState, LocalEvent, State, Event>,
  SourceState,
  SourceEvent,
  State,
  Event
> {
  protected _onObserve(observer: Observer<State>) {
    return new ViewStore(this._config, observer);
  }
}

class ViewStore<
  SourceState,
  SourceEvent,
  LocalState,
  LocalEvent,
  State = SourceState & LocalState,
  Event = SourceEvent | LocalEvent,
> extends BasePipeStore<
  ViewConfig<SourceState, SourceEvent, LocalState, LocalEvent, State, Event>,
  SourceState,
  SourceEvent,
  State,
  Event
> {
  private _localState!: LocalState;
  private _sourceState!: SourceState;
  private _hasSourceState: boolean = false;
  private _dispatchDepth: number = 0;
  private _isDirty: boolean = false;

  private _setLocalState(localState: LocalState) {
    if (localState !== this._localState) {
      this._localState = localState;
      if (this._dispatchDepth > 0) {
        this._isDirty = true;
      } else {
        this._emitCombinedState();
      }
    }
  }

  private _setSourceState(sourceState: SourceState) {
    const isInitialEmission = !this._hasSourceState;
    this._hasSourceState = true;
    if (isInitialEmission || sourceState !== this._sourceState) {
      this._sourceState = sourceState;
      if (this._dispatchDepth > 0) {
        this._isDirty = true;
      } else {
        this._emitCombinedState();
      }
    }
  }

  private _emitCombinedState() {
    if (!this._hasSourceState) {
      throw new Error(
        `[${this.constructor.name}] Contract violation: Attempted to emit combined state before receiving an initial source state. Ensure that the source emits an initial state upon initialization.`,
      );
    }
    const combinedState = this._config.combineState
      ? this._config.combineState(this._sourceState, this._localState)
      : ({ ...this._sourceState, ...this._localState } as State);
    this._emit(combinedState);
  }

  private _emitCombinedStateIfNeeded() {
    if (!this._isDirty) {
      return;
    }
    this._isDirty = false;
    this._emitCombinedState();
  }

  protected _onInit(): void {
    this._localState = this._config.initialLocalState;
    this._connect();
  }

  protected _onNext(sourceState: SourceState): void {
    this._setSourceState(sourceState);
  }

  protected _onDispatch(event: EventOrEvents<Event>): void {
    this._dispatchDepth += 1;
    try {
      const sourceEvents: SourceEvent[] = [];
      if (Array.isArray(event)) {
        event.forEach((e) => this._processEvent(e, sourceEvents));
      } else {
        this._processEvent(event as Event, sourceEvents);
      }
      this._send(sourceEvents);
    } finally {
      this._dispatchDepth -= 1;
      if (this._dispatchDepth === 0) {
        this._emitCombinedStateIfNeeded();
      }
    }
  }

  private _processEvent(event: Event, sourceEvents: SourceEvent[]) {
    const { source, local } = this._config.mapEvent(event, this._localState);
    if (source !== undefined) {
      sourceEvents.push(source);
    }
    if (local !== undefined) {
      const localState = this._config.reduceLocal(this._localState, local);
      this._setLocalState(localState);
    }
  }

  protected _onDispose(): void {
    this._unconnect();
  }
}

export { ViewEvent, ViewConfig, view };
