import { and, asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import { env, getDb, schema } from '@college/shared';

/** Кому команда доступна по умолчанию, до любых изменений через админку. */
const DEFAULT_ACCESS: Record<string, number[]> = {
	rov: [5206203654],
};

@singleton()
export class AccessService {
	private readonly db = getDb();

	async isAllowed(command: string, telegramId: number): Promise<boolean> {
		if (env.adminIds.includes(telegramId)) return true;
		if (DEFAULT_ACCESS[command]?.includes(telegramId)) return true;
		const [row] = await this.db
			.select()
			.from(schema.commandAccess)
			.where(
				and(
					eq(schema.commandAccess.command, command),
					eq(schema.commandAccess.telegramId, telegramId),
				),
			);
		return Boolean(row);
	}

	async grant(command: string, telegramId: number, grantedBy: number): Promise<void> {
		await this.db
			.insert(schema.commandAccess)
			.values({ command, telegramId, grantedBy })
			.onConflictDoNothing();
	}

	async revoke(command: string, telegramId: number): Promise<void> {
		await this.db
			.delete(schema.commandAccess)
			.where(
				and(
					eq(schema.commandAccess.command, command),
					eq(schema.commandAccess.telegramId, telegramId),
				),
			);
	}

	/** Выданные вручную id плюс те, что зашиты по умолчанию. */
	async list(command: string): Promise<number[]> {
		const rows = await this.db
			.select({ telegramId: schema.commandAccess.telegramId })
			.from(schema.commandAccess)
			.where(eq(schema.commandAccess.command, command))
			.orderBy(asc(schema.commandAccess.telegramId));
		return [...new Set([...(DEFAULT_ACCESS[command] ?? []), ...rows.map((row) => row.telegramId)])];
	}
}
