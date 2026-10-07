export type ElementConstructor<T extends Element> = new (...args: never[]) => T;

export function requireElement<T extends HTMLElement>(
  id: string,
  constructor: ElementConstructor<T>
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Expected #${id} to be ${constructor.name}.`);
  }
  return element;
}
