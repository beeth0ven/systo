import { Disposable, Observable, Observer, Operator } from '../core.js';
import { InitScheduler } from '../utils/init-scheduler.js';
import { BasePipeStore, PipeConfig } from './base-pipe.js';
import { BaseStore, BaseSystem } from './base.js';

function share<State, Event>(): Operator<State, Event> {
  return (source) => new Share({ source });
}

class Share<State, Event> extends BaseSystem<PipeConfig<State, Event>, State, Event> {
  private _shared: SharedState<State, Event> = {};

  protected _onObserve(observer: Observer<State>) {
    return new ShareStore(this._shared, this._config, observer);
  }
}

// The state bucket shared across all Store instances created by a single ShareSystem
interface SharedState<State, Event> {
  sourceStore?: SharedSourceStore<State, Event>;
}

/**
 * 1. The Intermediary Shared Connection Store.
 * Since it is a 1:1 connection to the upstream source, it perfectly extends BasePipeStore.
 */
class SharedSourceStore<State, Event>
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  extends BasePipeStore<{}, State, Event>
  implements Observable<State>
{
  private _latestState?: State;
  private _hasState = false;
  private readonly _observers = new Set<Observer<State>>();

  public get hasObservers(): boolean {
    return this._observers.size > 0;
  }

  protected _onInit(): void {
    this._connect();
  }

  observe(observer: Observer<State>): Disposable {
    this._observers.add(observer);
    if (this._hasState) {
      InitScheduler.schedulePostInitSync(() => {
        if (this._observers.has(observer)) {
          observer.next(this._latestState as State);
        }
      });
    }
    return {
      dispose: () => this._observers.delete(observer),
    };
  }

  protected _onNext(sourceState: State): void {
    this._latestState = sourceState;
    this._hasState = true;
    this._observers.forEach((observer) => observer.next(sourceState));
  }

  protected _onDispatch(event: Event | readonly Event[]): void {
    this._send(event);
  }

  protected _onDispose(): void {
    this._observers.clear();
    this._latestState = undefined;
    this._hasState = false;
    this._unconnect();
  }
}

/**
 * 2. The Leaf Store.
 * Simple, standard BaseStore that proxies to the SharedSourceStore.
 */
class ShareStore<State, Event>
  extends BaseStore<PipeConfig<State, Event>, State, Event>
  implements Observer<State>
{
  private _observation?: Disposable;

  constructor(
    private readonly _shared: SharedState<State, Event>,
    _config: PipeConfig<State, Event>,
    _observer: Observer<State>,
  ) {
    super(_config, _observer);
  }

  protected get _source(): SharedSourceStore<State, Event> | undefined {
    return this._shared.sourceStore;
  }

  protected set _source(value: SharedSourceStore<State, Event> | undefined) {
    this._shared.sourceStore = value;
  }

  protected _onInit(): void {
    let source = this._source;
    if (!source) {
      source = new SharedSourceStore(this._config, { next: () => {} });
      source.init();
      this._source = source;
    }
    this._observation = source.observe(this);
  }

  next(state: State): void {
    this._emit(state);
  }

  protected _onDispatch(event: Event | readonly Event[]): void {
    this._source?.dispatch(event);
  }

  protected _onDispose(): void {
    this._observation?.dispose();
    this._observation = undefined;
    const source = this._source;
    if (source && !source.hasObservers) {
      source.dispose();
      this._source = undefined;
    }
  }
}

export { share };
