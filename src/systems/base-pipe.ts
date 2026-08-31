import { Observer, Store, System } from '../core.js';
import { BaseStore, BaseSystem } from './base.js';

interface PipeConfig<SourceState, SourceEvent> {
  source: System<SourceState, SourceEvent>;
}

abstract class BasePipeSystem<
  Config,
  State,
  Event,
  SourceState = State,
  SourceEvent = Event,
> extends BaseSystem<Config & PipeConfig<SourceState, SourceEvent>, State, Event> {
  protected abstract _onObserve(
    observer: Observer<State>,
  ): BasePipeStore<Config, State, Event, SourceState, SourceEvent>;
}

abstract class BasePipeStore<Config, State, Event, SourceState = State, SourceEvent = Event>
  extends BaseStore<Config & PipeConfig<SourceState, SourceEvent>, State, Event>
  implements Observer<SourceState>
{
  private _source?: Store<SourceState, SourceEvent>;

  protected _connect() {
    this._source = this._config.source.observe(this);
  }

  next(sourceState: SourceState): void {
    if (this._isDisposed) {
      return;
    }
    this._onNext(sourceState);
  }

  protected abstract _onNext(sourceState: SourceState): void;

  protected _send(sourceEvent: SourceEvent | readonly SourceEvent[]): void {
    if (this._isDisposed) {
      return;
    }
    if (Array.isArray(sourceEvent) && sourceEvent.length === 0) {
      return;
    }
    this._source?.dispatch(sourceEvent);
  }

  protected _unconnect() {
    this._source?.dispose();
    this._source = undefined;
  }
}

export { PipeConfig, BasePipeSystem, BasePipeStore };
