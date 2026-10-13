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
    },
  };
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

/**
 * Represents a disposable resource which only allows a single assignment of its underlying disposable resource.
 *
 * If an underlying disposable resource has already been set, future attempts to set the underlying disposable resource will throw an exception.
 */
class SingleAssignmentDisposable implements Disposable {
  private _disposable: Disposable | null = null;
  private _isDisposed: boolean = false;
  private _hasBeenAssigned: boolean = false;

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  setDisposable(disposable: Disposable): void {
    if (this._hasBeenAssigned) {
      throw new Error('[SingleAssignmentDisposable] Disposable has already been assigned.');
    }
    this._hasBeenAssigned = true;
    if (this._isDisposed) {
      disposable.dispose();
      return;
    }
    this._disposable = disposable;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    const disposable = this._disposable;
    this._disposable = null;
    disposable?.dispose();
  }
}

export { emptyDisposable, disposable, toDisposable, SingleAssignmentDisposable };
