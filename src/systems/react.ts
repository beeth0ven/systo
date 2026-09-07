import { Operator, Teardown } from '../core.js';

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
  effect: (
    request: Request,
    dispatch: (event: Event | readonly Event[]) => void,
  ) => Teardown;

  /**
   * Optional equality comparator (defaults to reference/shallow equality `===`).
   */
  areEqual?: (previous: Request, current: Request) => boolean;
}

function react<Request, State, Event>(
  config: ReactConfig<Request, State, Event>,
): Operator<State, Event> {
  throw Error(`Unimplemented with config: ${config}`);
}

export { ReactConfig, react };
