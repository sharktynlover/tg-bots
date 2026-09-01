import { addHandler } from './metadata';

/** Registers a Telegram command handler, e.g. `@Command('start')`. */
export function Command(name: string): MethodDecorator {
  return (target, propertyKey) => {
    addHandler(target as object, {
      kind: 'command',
      trigger: name.replace(/^\//, ''),
      method: String(propertyKey),
    });
  };
}
