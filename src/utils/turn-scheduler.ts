type ActionKind = 'init' | 'emit' | 'dispatch';

interface StackFrame {
  target: object;
  kind: ActionKind;
}

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
