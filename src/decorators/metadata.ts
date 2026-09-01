import 'reflect-metadata';

export type HandlerKind = 'command' | 'callback' | 'hears' | 'on';

export interface HandlerMetadata {
  kind: HandlerKind;
  /** Command name, callback-data prefix/regex, button text or grammy filter query. */
  trigger: string | RegExp;
  method: string;
  guards: string[];
}

export const HANDLERS_KEY = Symbol.for('bot:handlers');
export const KEYBOARD_KEY = Symbol.for('bot:keyboard');

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getHandlers(target: Function): HandlerMetadata[] {
  return (Reflect.getMetadata(HANDLERS_KEY, target) as HandlerMetadata[] | undefined) ?? [];
}

export function addHandler(target: object, handler: Omit<HandlerMetadata, 'guards'>): void {
  const ctor = target.constructor;
  const existing = getHandlers(ctor);
  const guards = (Reflect.getMetadata(`${String(HANDLERS_KEY)}:guards:${handler.method}`, ctor) ??
    []) as string[];
  Reflect.defineMetadata(HANDLERS_KEY, [...existing, { ...handler, guards }], ctor);
}

export function addGuard(target: object, method: string, guard: string): void {
  const ctor = target.constructor;
  const key = `${String(HANDLERS_KEY)}:guards:${method}`;
  const guards = (Reflect.getMetadata(key, ctor) ?? []) as string[];
  Reflect.defineMetadata(key, [...guards, guard], ctor);

  // Handlers may already be registered when decorators are evaluated bottom-up.
  const handlers = getHandlers(ctor).map((handler) =>
    handler.method === method ? { ...handler, guards: [...handler.guards, guard] } : handler,
  );
  Reflect.defineMetadata(HANDLERS_KEY, handlers, ctor);
}
