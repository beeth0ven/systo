import { Disposable, Teardown } from '../core.js';

const emptyDisposable: Disposable = Object.freeze({
  dispose() {},
});

function disposable(dispose: () => void): Disposable {
  let isDisposed = false;
  return {
    dispose: () => {
      if (isDisposed) return;
      isDisposed = true;
      dispose();
    }
  }
}

/**
 * Normalizes any Teardown/DisposableLike into a safe, idempotent Disposable.
 */
function toDisposable(teardown: Teardown): Disposable {
  if (typeof teardown === 'function') {
    return disposable(teardown);
  } else if (teardown && typeof teardown.dispose === 'function') {
    return disposable(() => teardown.dispose());
  } else {
    return emptyDisposable;
  }
}

export { emptyDisposable, disposable, toDisposable };