function pipe<T>(value: T): T;
function pipe<T, A>(value: T, fn1: (arg: T) => A): A;
function pipe<T, A, B>(value: T, fn1: (arg: T) => A, fn2: (arg: A) => B): B;
function pipe<T, A, B, C>(value: T, fn1: (arg: T) => A, fn2: (arg: A) => B, fn3: (arg: B) => C): C;
function pipe<T, A, B, C, D>(
  value: T,
  fn1: (arg: T) => A,
  fn2: (arg: A) => B,
  fn3: (arg: B) => C,
  fn4: (arg: C) => D,
): D;
function pipe<T, A, B, C, D, E>(
  value: T,
  fn1: (arg: T) => A,
  fn2: (arg: A) => B,
  fn3: (arg: B) => C,
  fn4: (arg: C) => D,
  fn5: (arg: D) => E,
): E;
function pipe<T, A, B, C, D, E, F>(
  value: T,
  fn1: (arg: T) => A,
  fn2: (arg: A) => B,
  fn3: (arg: B) => C,
  fn4: (arg: C) => D,
  fn5: (arg: D) => E,
  fn6: (arg: E) => F,
): F;

function pipe(value: any, ...fns: Array<(arg: any) => any>): any {
  return fns.reduce((acc, fn) => fn(acc), value);
}

export { pipe };
