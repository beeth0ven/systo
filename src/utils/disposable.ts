import { Disposable, Teardown } from '../core.js';

const emptyDisposable: Disposable = Object.freeze({
  dispose() {},
});

function toDisposable(teardown: Teardown): Disposable {
  if (typeof teardown === 'function') {
    return { dispose: teardown };
  } else if (teardown) {
    return teardown;
  }
  return emptyDisposable;
}

export { emptyDisposable, toDisposable };
