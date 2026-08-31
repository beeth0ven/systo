import { Observer, Operator } from '../core.js';
import { BasePipeStore, BasePipeSystem } from './base-pipe.js';

interface ViewConfig<State, Event, LocalState, SourceState, SourceEvent> {
  initialLocalState: LocalState;

  /**
   * Combines local state and source state into the final State.
   */
  combineState: (localState: LocalState, sourceState: SourceState) => State;

  /**
   * (Optional) Local Reducer:
   * Returns updated local state if the event affects local state.
   */
  reduceLocal?: (localState: LocalState, event: Event) => LocalState;

  /**
   * (Optional) Source Event Forwarder:
   * Returns SourceEvent(s) to dispatch to the source system if applicable.
   * If an event is both local and source (e.g., optimistic update),
   * both `reduceLocal` and `toSourceEvent` can run!
   */
  toSourceEvent?: (event: Event, localState: LocalState) => SourceEvent | SourceEvent[] | undefined;
}

function view<State, Event, LocalState, SourceState, SourceEvent>(
  config: ViewConfig<State, Event, LocalState, SourceState, SourceEvent>,
): Operator<State, Event, SourceState, SourceEvent> {
  return (source) => new View({ ...config, source });
}

class View<State, Event, LocalState, SourceState, SourceEvent> extends BasePipeSystem<
  ViewConfig<State, Event, LocalState, SourceState, SourceEvent>,
  State,
  Event,
  SourceState,
  SourceEvent
> {
  protected _onObserve(observer: Observer<State>) {
    return new ViewStore(this._config, observer);
  }
}

class ViewStore<State, Event, LocalState, SourceState, SourceEvent> extends BasePipeStore<
  ViewConfig<State, Event, LocalState, SourceState, SourceEvent>,
  State,
  Event,
  SourceState,
  SourceEvent
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
    const combinedState = this._config.combineState(this._localState, this._sourceState);
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
  
  protected _onDispatch(event: Event | readonly Event[]): void {
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
    if (this._config.toSourceEvent) {
      const sourceEvent = this._config.toSourceEvent(event, this._localState);
      if (Array.isArray(sourceEvent)) {
        sourceEvents.push(...sourceEvent);
      } else if (sourceEvent !== undefined) {
        sourceEvents.push(sourceEvent);
      }
    }
    if (this._config.reduceLocal) {
      const localState = this._config.reduceLocal(this._localState, event);
      this._setLocalState(localState);
    }
  }

  protected _onDispose(): void {
    this._unconnect();
  }
}

export { ViewConfig, view };
