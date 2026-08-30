import 'reflect-metadata';
import { injectable } from 'tsyringe';

const HANDLERS = Symbol('handlers');

export type HandlerKind = 'command' | 'hears' | 'callback' | 'text';

export interface HandlerMeta {
	kind: HandlerKind;
	trigger: string | RegExp;
	method: string;
	adminOnly: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctor = abstract new (...args: any[]) => object;

function push(target: object, meta: HandlerMeta): void {
	const owner = target.constructor;
	const handlers: HandlerMeta[] = Reflect.getOwnMetadata(HANDLERS, owner) ?? [];
	handlers.push(meta);
	Reflect.defineMetadata(HANDLERS, handlers, owner);
}

export function getHandlers(controller: Ctor): HandlerMeta[] {
	return Reflect.getOwnMetadata(HANDLERS, controller) ?? [];
}

/** Помечает класс контроллером и регистрирует его в DI-контейнере. */
export function Controller(): ClassDecorator {
	return (target) => {
		injectable()(target as unknown as new (...args: never[]) => object);
	};
}

function handler(kind: HandlerKind, trigger: string | RegExp, adminOnly = false): MethodDecorator {
	return (target, propertyKey) => {
		push(target as object, { kind, trigger, method: String(propertyKey), adminOnly });
	};
}

/** `/command` без слэша. */
export function Command(name: string): MethodDecorator {
	return handler('command', name);
}

/** `/command`, доступная только Telegram id из ADMIN_IDS. */
export function AdminCommand(name: string): MethodDecorator {
	return handler('command', name, true);
}

/** Нажатие кнопки Reply-клавиатуры. */
export function Hears(trigger: string | RegExp): MethodDecorator {
	return handler('hears', trigger);
}

/** Нажатие Inline-кнопки (callback_data). */
export function Callback(trigger: string | RegExp): MethodDecorator {
	return handler('callback', trigger);
}

/** Любое текстовое сообщение — используется для пошаговых сценариев. */
export function Text(): MethodDecorator {
	return handler('text', /.*/);
}
