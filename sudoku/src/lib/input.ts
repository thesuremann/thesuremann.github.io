function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getTagName(target: unknown): string {
  if (!isObject(target) || typeof target.tagName !== 'string') {
    return '';
  }

  return target.tagName.toUpperCase();
}

export function isTypingTarget(target: unknown): boolean {
  if (!isObject(target)) return false;
  if (Boolean(target.isContentEditable)) return true;

  const tagName = getTagName(target);
  return tagName === 'INPUT'
    || tagName === 'TEXTAREA'
    || tagName === 'SELECT';
}

export function isButtonActivationTarget(target: unknown, key: string): boolean {
  if (getTagName(target) !== 'BUTTON') return false;
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
