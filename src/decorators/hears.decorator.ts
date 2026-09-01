import { addHandler } from './metadata';

/** Registers a reply-keyboard button / plain text handler. */
export function Hears(trigger: string | RegExp): MethodDecorator {
  return (target, propertyKey) => {
    addHandler(target as object, { kind: 'hears', trigger, method: String(propertyKey) });
  };
}

/** Registers a grammy filter-query handler, e.g. `@On('message:photo')`. */
export function On(filterQuery: string): MethodDecorator {
  return (target, propertyKey) => {
    addHandler(target as object, { kind: 'on', trigger: filterQuery, method: String(propertyKey) });
  };
}
