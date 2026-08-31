import { Observer, Store, System } from '../core.js';
import { InitScheduler } from '../utils/index.js';

abstract class BaseSystem<Config, State, Event> implements System<State, Event> {
  constructor(protected readonly _config: Config) {}

  observe(observer: Observer<State>): Store<State, Event> {
    const store = this._onObserve(observer);
    store.init();
    return store;
  }

  protected abstract _onObserve(observer: Observer<State>): BaseStore<Config, State, Event>;
}

/**
 * Base implementation of a Store representing an active stream subscription.
 *
 * ### Initialization Contract:
 * - `_onInit()` must only contain pure synchronous initialization logic (e.g., subscribing to upstream sources).
 * - **Do not** trigger synchronous state emissions (`next`) or cleanup procedures (`dispose`) directly inside `_onInit()`.
 * - Any synchronous emissions or teardown logic occurring during setup must be wrapped in `InitScheduler.schedulePostInitSync(...)`
 *   to ensure the entire subscription tree is established first.
 */
abstract class BaseStore<Config, State, Event> implements Store<State, Event> {
  protected _isDisposed: boolean = false;
  private _isInitialized: boolean = false;
  constructor(
    protected readonly _config: Config,
    private readonly _observer: Observer<State>,
  ) {}

  init(): void {
    if (this._isInitialized) {
      return;
    }
    this._isInitialized = true;
    InitScheduler.scheduleInit(() => this._onInit());
  }

  protected _onInit(): void {}

  protected _emit(state: State): void {
    if (this._isDisposed) {
      return;
    }
    this._observer.next(state);
  }

  dispatch(event: Event | readonly Event[]): void {
    if (this._isDisposed) {
      return;
    }
    if (Array.isArray(event) && event.length == 0) {
      return;
    }
    this._onDispatch(event);
  }

  protected abstract _onDispatch(event: Event | readonly Event[]): void;

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._onDispose();
  }

  protected _onDispose(): void {}
}

export { BaseSystem, BaseStore };
