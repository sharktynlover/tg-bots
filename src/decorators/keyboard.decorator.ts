import 'reflect-metadata';
import type { InlineKeyboard, Keyboard as ReplyKeyboard } from 'grammy';
import { KEYBOARD_KEY } from './metadata';

type KeyboardFactory = (...args: never[]) => InlineKeyboard | ReplyKeyboard;

const registry = new Map<string, KeyboardFactory>();

/** Registers a named keyboard factory so it can be resolved by name at runtime. */
export function Keyboard(name: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const factory = (descriptor as unknown as TypedPropertyDescriptor<KeyboardFactory>).value;
    if (factory) {
      registry.set(name, factory);
      Reflect.defineMetadata(KEYBOARD_KEY, name, target as object, propertyKey);
    }
  };
}

export function getKeyboard(name: string): KeyboardFactory | undefined {
  return registry.get(name);
}
