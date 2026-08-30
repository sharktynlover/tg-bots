import { addHandler } from './metadata';

/**
 * Registers an inline-keyboard callback handler.
 * Accepts an exact string (`@Callback('profile:edit')`) or a pattern
 * (`@Callback(/^like:(\d+)$/)`).
 */
export function Callback(trigger: string | RegExp): MethodDecorator {
  return (target, propertyKey) => {
    addHandler(target as object, {
      kind: 'callback',
      trigger,
      method: String(propertyKey),
    });
  };
}
