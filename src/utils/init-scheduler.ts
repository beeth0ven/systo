/**
 * A synchronous scheduler designed to coordinate the initialization sequence
 * of systems and stores. Defers state emissions until the entire system tree
 * is synchronously connected and initialized.
 *
 * @note This scheduler only supports synchronous initialization flows. Any
 * asynchronous operations (such as Promises, microtasks, or setTimeouts) will
 * execute outside this scheduler's deferred synchronization queue.
 */
class InitScheduler {
  private static _current: InitScheduler | null = null;
  private readonly _postInitSyncQueue: (() => void)[] = [];

  /**
   * Establishes an initialization context for executing synchronous store setup.
   */
  static scheduleInit<T>(fn: () => T): T {
    if (InitScheduler._current) {
      return fn();
    }
    InitScheduler._current = new InitScheduler();
    try {
      const result = fn();
      InitScheduler._current._flushPostInitSyncQueue();
      return result;
    } finally {
      InitScheduler._current = null;
    }
  }

  /**
   * Schedules a synchronous callback (such as a stream emission or disposal)
   * to run immediately after the initialization phase of all active stores is complete.
   */
  static schedulePostInitSync(fn: () => void): void {
    if (InitScheduler._current) {
      InitScheduler._current._postInitSyncQueue.push(fn);
    } else {
      fn();
    }
  }

  private _flushPostInitSyncQueue(): void {
    while (this._postInitSyncQueue.length > 0) {
      const fn = this._postInitSyncQueue.shift()!;
      fn();
    }
  }
}

export { InitScheduler };
