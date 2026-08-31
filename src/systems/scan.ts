import { Observer, System } from '../core.js';
import { applyReduce, InitScheduler } from '../utils/index.js';
import { BaseStore, BaseSystem } from './base.js';

interface ScanConfig<State, Event> {
  initialState: Readonly<State>;
  reduce: (state: Readonly<State>, event: Readonly<Event>) => Readonly<State>;
}

function scan<State, Event>(config: ScanConfig<State, Event>): System<State, Event> {
  return new Scan(config);
}

class Scan<State, Event> extends BaseSystem<ScanConfig<State, Event>, State, Event> {
  protected _onObserve(observer: Observer<State>) {
    return new ScanStore(this._config, observer);
  }
}

class ScanStore<State, Event> extends BaseStore<ScanConfig<State, Event>, State, Event> {
  private _state!: State;

  protected _onInit(): void {
    this._state = this._config.initialState;
    InitScheduler.schedulePostInitSync(() => this._emit(this._state));
  }

  protected _onDispatch(event: Event | readonly Event[]): void {
    this._state = applyReduce(this._config.reduce, this._state, event);
    this._emit(this._state);
  }
}

export { ScanConfig, scan };
