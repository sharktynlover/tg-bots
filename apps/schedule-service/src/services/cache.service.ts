import { eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';
import { getDb, schema, type WeekSchedule } from '@college/shared';

@singleton()
export class CacheService {
	private readonly db = getDb();

	async getWeek(groupApiId: string): Promise<WeekSchedule | null> {
		const [row] = await this.db
			.select()
			.from(schema.scheduleCache)
			.where(eq(schema.scheduleCache.groupApiId, groupApiId));
		return row?.parsedData ?? null;
	}
}
