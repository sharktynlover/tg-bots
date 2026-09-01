import { inject, singleton } from 'tsyringe';
import { count, eq } from 'drizzle-orm';
import type { Database } from '@/config/database.config';
import { DATABASE_TOKEN } from '@/config/database.config';
import { questions, type QuestionRow } from '@/entities';

@singleton()
export class QuestionRepository {
  constructor(@inject(DATABASE_TOKEN) private readonly db: Database) {}

  async create(fromUserId: number, toUserId: number, questionText: string): Promise<QuestionRow> {
    const [row] = await this.db
      .insert(questions)
      .values({ fromUserId, toUserId, questionText })
      .returning();
    if (!row) throw new Error('Failed to create question');
    return row;
  }

  async findById(id: number): Promise<QuestionRow | null> {
    const [row] = await this.db.select().from(questions).where(eq(questions.id, id)).limit(1);
    return row ?? null;
  }

  async answer(id: number, answerText: string): Promise<QuestionRow | null> {
    const [row] = await this.db
      .update(questions)
      .set({ answerText, status: 'answered', isAnonymous: false, answeredAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return row ?? null;
  }

  async ignore(id: number): Promise<QuestionRow | null> {
    const [row] = await this.db
      .update(questions)
      .set({ status: 'ignored' })
      .where(eq(questions.id, id))
      .returning();
    return row ?? null;
  }

  async total(): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(questions);
    return row?.value ?? 0;
  }
}
