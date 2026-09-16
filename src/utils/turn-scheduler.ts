type ActionKind = 'init' | 'emit' | 'dispatch';

interface StackFrame {
  target: object;
  kind: ActionKind;
}

/**
 * Synchronous Call-Stack Turn Scheduler enforcing Run-To-Completion (RTC) semantics
 * across tree initializations, internal pipeline forwarding, and feedback loops.
 *
 * ### Architectural Model:
 * Rather than relying on blunt global locks or isolated per-instance flags, `TurnScheduler`
 * maintains an active **execution call stack** of `StackFrame` items (`target` + `kind`).
 * Re-entrancy decisions are evaluated deterministically against the top active frame (`last`)
 * and duplicate presence on the stack.
 *
 * ### Transition Rules Matrix:
 * 1. **`last.kind === 'init'` (Initialization Phase):**
 *    - Any subsequent call to `emit` or `dispatch` is classified as **re-entrant** and queued.
 *    - State emissions during store setup are automatically deferred until the entire
 *      system subscription tree has synchronously connected.
 *
 * 2. **`last.kind === 'emit'` (Downward Emission Phase):**
 *    - **Any** call to `dispatch` (from observers, effects, or other stores) is classified as
 *      **re-entrant** and queued for the subsequent turn (guarantees RTC).
 *    - A call to `emit` for a `target` that **already exists on the stack** with `kind === 'emit'`
 *      is classified as **re-entrant** and queued (prevents re-emit cascades and infinite loops).
 *    - Calls to `emit` on downstream targets flow synchronously down the call stack.
 *
 * 3. **`last.kind === 'dispatch'` (Upward Forwarding Phase):**
 *    - A call to `dispatch` for a `target` that **already exists on the stack** with `kind === 'dispatch'`
 *      is classified as **re-entrant** and queued (prevents recursive dispatch loops on the same store).
 *    - Calls to `dispatch` on upstream sources (`_send`) and calls to `emit` (reducers updating state)
 *      are **not re-entrant** and execute synchronously on the call stack (preserves atomic batching).
 *
 * 4. **`stack.length === 0` (Idle Phase):**
 *    - Any call begins a new primary turn, executes immediately, and triggers a queue drain once
 *      the call stack returns to 0.
 */
class TurnScheduler {
  private static readonly _stack: StackFrame[] = [];
  private static readonly _queue: (() => void)[] = [];
  private static _isDraining: boolean = false;

  static scheduleInit<T>(target: object, fn: () => T): T {
    this._stack.push({ target, kind: 'init' });
    try {
      return fn();
    } catch (error) {
      this._reset();
      throw error;
    } finally {
      this._stack.pop();
      this._drainQueueIfNeeded();
    }
  }

  static scheduleEmit(target: object, action: () => void): void {
    if (this._isReentrant(target, 'emit')) {
      this._queue.push(() => this.scheduleEmit(target, action));
      return;
    }
    try {
      action();
    } catch (error) {
      this._reset();
      throw error;
    } finally {
      this._stack.pop();
      this._drainQueueIfNeeded();
    }
  }

  static scheduleDispatch(target: object, action: () => void): void {
    if (this._isReentrant(target, 'dispatch')) {
      this._queue.push(() => this.scheduleDispatch(target, action));
      return;
    }
    try {
      action();
    } catch (error) {
      this._reset();
      throw error;
    } finally {
      this._stack.pop();
      this._drainQueueIfNeeded();
    }
  }

  private static _isReentrant(target: object, kind: ActionKind): boolean {
    if (this._stack.length === 0) return false;
    const last = this._stack[this._stack.length - 1];
    const isDuplicate = this._stack.some((it) => it.target === target && it.kind === kind);
    switch (last.kind) {
      case 'init':
        return kind === 'emit' || kind === 'dispatch';
      case 'emit':
        return kind === 'dispatch' || (kind === 'emit' && isDuplicate);
      case 'dispatch':
        return kind === 'dispatch' && isDuplicate;
    }
  }

  private static _drainQueueIfNeeded(): void {
    if (this._stack.length > 0 || this._isDraining) return;
    this._isDraining = true;
    try {
      while (this._queue.length > 0) {
        const nextTask = this._queue.shift()!;
        nextTask();
      }
    } finally {
      this._isDraining = false;
    }
  }

  private static _reset(): void {
    this._stack.length = 0;
    this._queue.length = 0;
    this._isDraining = false;
  }
}

export { TurnScheduler };
