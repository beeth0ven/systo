import { Disposable, Teardown } from '../core.js';

const emptyDisposable: Disposable = Object.freeze({
  dispose() {},
});

/**
 * Normalizes any Teardown/DisposableLike into a safe, idempotent Disposable.
 */
function toDisposable(teardown: Teardown): Disposable {
  if (!teardown) {
    return emptyDisposable;
  }
  if (typeof teardown === 'function') {
    let isDisposed = false;
    return {
      dispose: () => {
        if (isDisposed) return;
        isDisposed = true;
        teardown();
      },
    };
  }
  return teardown;
}

export { emptyDisposable, toDisposable };
