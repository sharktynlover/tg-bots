import { inject, singleton } from 'tsyringe';
import { BOT_API_TOKEN, type BotApi } from '@/bot';
import type { QuestionRow, UserRow } from '@/entities';
import { LikeRepository } from '@/repositories/like.repository';
import { QuestionRepository } from '@/repositories/question.repository';
import { ReportRepository } from '@/repositories/report.repository';
import { UserRepository } from '@/repositories/user.repository';
import { questionKeyboard } from '@/keyboards/swipe.keyboard';
import { MESSAGES } from '@/messages/ru';
import { render } from '@/utils/template';
import { logger } from '@/utils/logger';
import { trySend } from '@/utils/telegram.utils';

export type AskResult =
  | { ok: true; question: QuestionRow }
  | { ok: false; reason: 'liked' | 'blacklisted' | 'unavailable' };

@singleton()
export class QuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly likeRepository: LikeRepository,
    private readonly reportRepository: ReportRepository,
    private readonly userRepository: UserRepository,
    @inject(BOT_API_TOKEN) private readonly api: BotApi,
  ) {}

  async canAsk(fromUserId: number, toUserId: number): Promise<boolean> {
    const [like, blocked, reverseBlocked] = await Promise.all([
      this.likeRepository.find(fromUserId, toUserId),
      this.reportRepository.isBlacklisted(toUserId, fromUserId),
      this.reportRepository.isBlacklisted(fromUserId, toUserId),
    ]);
    return !like && !blocked && !reverseBlocked;
  }

  async ask(from: UserRow, toUserId: number, text: string): Promise<AskResult> {
    const target = await this.userRepository.findById(toUserId);
    if (!target || target.isBanned || !target.isProfileComplete) {
      return { ok: false, reason: 'unavailable' };
    }
    if (await this.likeRepository.find(from.id, toUserId)) return { ok: false, reason: 'liked' };
    if (!(await this.canAsk(from.id, toUserId))) return { ok: false, reason: 'blacklisted' };

    const question = await this.questionRepository.create(from.id, toUserId, text);
    await trySend(() =>
      this.api.sendMessage(toUserId, render(MESSAGES.QUESTIONS.RECEIVED, { text }), {
        reply_markup: questionKeyboard(question.id),
      }),
    );
    logger.info({ event: 'question_sent', userId: from.id, targetId: toUserId }, 'question');
    return { ok: true, question };
  }

  async findPending(questionId: number, recipientId: number): Promise<QuestionRow | null> {
    const question = await this.questionRepository.findById(questionId);
    if (!question || question.toUserId !== recipientId || question.status !== 'pending') return null;
    return question;
  }

  /** Answering reveals the responder's identity to the asker. */
  async answer(question: QuestionRow, responder: UserRow, answerText: string): Promise<void> {
    await this.questionRepository.answer(question.id, answerText);
    await trySend(() =>
      this.api.sendMessage(
        question.fromUserId,
        render(MESSAGES.QUESTIONS.ANSWERED, {
          name: responder.username ? `${responder.name} (@${responder.username})` : (responder.name ?? ''),
          answer: answerText,
        }),
      ),
    );
    logger.info({ event: 'question_answered', questionId: question.id }, 'question answered');
  }

  async ignore(questionId: number): Promise<void> {
    await this.questionRepository.ignore(questionId);
  }
}
