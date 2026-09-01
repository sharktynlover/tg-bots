import { count, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import { getDb, schema, type ScheduleFormat, type User } from '@college/shared';

@singleton()
export class UserService {
	private readonly db = getDb();

	async getOrCreate(telegramId: number): Promise<User> {
		const [existing] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.telegramId, telegramId));
		if (existing) return existing;
		const [created] = await this.db
			.insert(schema.users)
			.values({ telegramId })
			.onConflictDoUpdate({
				target: schema.users.telegramId,
				set: { telegramId },
			})
			.returning();
		return created!;
	}

	async find(telegramId: number): Promise<User | null> {
		const [user] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.telegramId, telegramId));
		return user ?? null;
	}

	async setGroup(telegramId: number, groupApiId: string): Promise<void> {
		await this.db
			.update(schema.users)
			.set({ groupApiId })
			.where(eq(schema.users.telegramId, telegramId));
	}

	async setReminderOffset(telegramId: number, reminderOffset: number | null): Promise<void> {
		await this.db
			.update(schema.users)
			.set({ reminderOffset })
			.where(eq(schema.users.telegramId, telegramId));
	}

	async setScheduleFormat(telegramId: number, scheduleFormat: ScheduleFormat): Promise<void> {
		await this.db
			.update(schema.users)
			.set({ scheduleFormat })
			.where(eq(schema.users.telegramId, telegramId));
	}

	/** Подписчики группы, которым включены напоминания за `offset` минут. */
	async findForReminder(groupApiId: string, offset: number): Promise<User[]> {
		return this.db
			.select()
			.from(schema.users)
			.where(
				sql`${schema.users.groupApiId} = ${groupApiId} and ${schema.users.reminderOffset} = ${offset}`,
			);
	}

	async findByGroup(groupApiId: string): Promise<User[]> {
		return this.db.select().from(schema.users).where(eq(schema.users.groupApiId, groupApiId));
	}

	async findByGroups(groupApiIds: string[]): Promise<User[]> {
		if (groupApiIds.length === 0) return [];
		return this.db.select().from(schema.users).where(inArray(schema.users.groupApiId, groupApiIds));
	}

	async findAll(): Promise<User[]> {
		return this.db.select().from(schema.users);
	}

	async stats(): Promise<{ users: number; groups: number; reminders: number }> {
		const [users] = await this.db.select({ value: count() }).from(schema.users);
		const [groups] = await this.db
			.select({ value: sql<number>`count(distinct ${schema.users.groupApiId})` })
			.from(schema.users);
		const [reminders] = await this.db
			.select({ value: count() })
			.from(schema.users)
			.where(isNotNull(schema.users.reminderOffset));
		return {
			users: users?.value ?? 0,
			groups: Number(groups?.value ?? 0),
			reminders: reminders?.value ?? 0,
		};
	}
}
