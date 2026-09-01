import { addGuard } from './metadata';

export type GuardName = 'auth' | 'profile' | 'admin' | 'developer';

/** Attaches a named guard middleware to a handler, e.g. `@Middleware('admin')`. */
export function Middleware(...guards: GuardName[]): MethodDecorator {
  return (target, propertyKey) => {
    for (const guard of guards) {
      addGuard(target as object, String(propertyKey), guard);
    }
  };
}
