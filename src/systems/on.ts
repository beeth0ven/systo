import { Observer, Operator } from '../core.js';
import { BasePipeStore, BasePipeSystem } from './base-pipe.js';

interface OnConfig<State, Event> {
  init?: () => void;
  next?: (state: State) => void;
  dispatch?: (event: Event | readonly Event[]) => void;
  dispose?: () => void;
}

function on<State, Event>(config: OnConfig<State, Event>): Operator<State, Event> {
  return (source) => new On({ ...config, source });
}

class On<State, Event> extends BasePipeSystem<OnConfig<State, Event>, State, Event> {
  protected _onObserve(observer: Observer<State>) {
    return new OnStore(this._config, observer);
  }
}

class OnStore<State, Event> extends BasePipeStore<OnConfig<State, Event>, State, Event> {
  _onInit(): void {
    this._config.init?.();
    this._connect();
  }

  _onNext(state: State): void {
    this._config.next?.(state);
    this._emit(state);
  }

  _onDispatch(event: Event | readonly Event[]): void {
    this._config.dispatch?.(event);
    this._send(event);
  }

  _onDispose(): void {
    this._config.dispose?.();
    this._unconnect();
  }
}

export { OnConfig, on };
