/**
 * A synchronous FIFO scheduler (trampoline) that serializes re-entrant dispatches,
 * ensure Run-To-Completion (RTC) semantics across feedback loops.
 */
class TrampolineScheduler {
  private static _isDispatching = false;
  private static readonly _queue: (() => void)[] = [];

  static schedule(action: () => void): void {
    if (this._isDispatching) {
      this._queue.push(action);
      return;
    }

    this._isDispatching = true;
    try {
      action();
      while (this._queue.length > 0) {
        const nextAction = this._queue.shift()!;
        nextAction();
      }
    } finally {
      this._isDispatching = false;
      // In case of an unhandled error, clear the queue to prevent executions
      this._queue.length = 0;
    }
  }
}

export { TrampolineScheduler };
