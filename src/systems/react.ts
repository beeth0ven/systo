import { Disposable, Observer, Operator, Teardown } from '../core.js';
import { toDisposable } from '../utils/disposable.js';
import { BasePipeStore, BasePipeSystem } from './base-pipe.js';

interface ReactConfig<Request, State, Event> {
  /**
   * Extracts a request object from the state.
   * Return `undefined` or `null` when no side effect should be active.
   */
  request: (state: State) => Request | undefined | null;

  /**
   * Executes the side-effect when a new distinct query is produced.
   * Can return a optional `Disposable` to cancel the pending operation.
   */
  effect: (request: Request, dispatch: (event: Event | readonly Event[]) => void) => Teardown;

  /**
   * Optional equality comparator (defaults to reference/shallow equality `===`).
   */
  areEqual?: (previous: Request, current: Request) => boolean;
}

function react<Request, State, Event>(
  config: ReactConfig<Request, State, Event>,
): Operator<State, Event> {
  return (source) => new React({ ...config, source });
}

class React<Request, State, Event> extends BasePipeSystem<
  ReactConfig<Request, State, Event>,
  State,
  Event
> {
  protected _onObserve(observer: Observer<State>) {
    return new ReactStore(this._config, observer);
  }
}

class ReactStore<Request, State, Event> extends BasePipeStore<
  ReactConfig<Request, State, Event>,
  State,
  Event
> {
  private _activeEffect: Disposable | null = null;
  private _request: Request | undefined | null;

  protected _onInit(): void {
    this._connect();
  }

  protected _onNext(sourceState: State): void {
    this._setRequest(this._config.request(sourceState));
    this._emit(sourceState);
  }

  protected _onDispatch(event: Event | readonly Event[]): void {
    this._send(event);
  }

  protected _onDispose(): void {
    this._disposeEffect();
    this._unconnect();
  }

  private _setRequest(request: Request | undefined | null) {
    if (!this._areRequestEqual(this._request, request)) {
      this._request = request;
      this._runEffect();
    }
  }

  private _areRequestEqual(
    previous: Request | undefined | null,
    current: Request | undefined | null,
  ): boolean {
    if (previous === current) return true;
    if (previous == null && current == null) return true;
    if (previous != null && current != null && this._config.areEqual != null) {
      return this._config.areEqual(previous, current);
    }
    return false;
  }

  private _runEffect() {
    this._disposeEffect();
    if (this._request != null) {
      this._activeEffect = this._createEffect(this._request);
    }
  }

  private _disposeEffect() {
    const activeEffect = this._activeEffect;
    if (activeEffect) {
      this._activeEffect = null;
      activeEffect.dispose();
    }
  }

  private _createEffect(request: Request): Disposable {
    let isDisposed = false;
    const effect = toDisposable(
      this._config.effect(request, (event) => {
        if (isDisposed) return;
        this.dispatch(event);
      }),
    );
    return {
      dispose: () => {
        if (isDisposed) return;
        isDisposed = true;
        effect.dispose();
      },
    };
  }
}

export { ReactConfig, react };
