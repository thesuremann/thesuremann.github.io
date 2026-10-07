export function requireIndex<T>(values: ArrayLike<T>, index: number, label: string): T {
  const value = values[index];
  if (value === undefined) {
    throw new RangeError(`${label}[${index}] is out of bounds.`);
  }
  return value;
}
