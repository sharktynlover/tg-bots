import { inject, singleton } from 'tsyringe';
import { BOT_API_TOKEN, type BotApi } from '@/bot';
import { env } from '@/config/env.config';
import type { ReportRow, UserRow } from '@/entities';
import { ReportRepository } from '@/repositories/report.repository';
import { reportActionsKeyboard } from '@/keyboards/admin.keyboard';
import { MESSAGES } from '@/messages/ru';
import { render } from '@/utils/template';
import { logger } from '@/utils/logger';
import { trySend } from '@/utils/telegram.utils';
import { BlacklistService } from './blacklist.service';

@singleton()
export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly blacklistService: BlacklistService,
    @inject(BOT_API_TOKEN) private readonly api: BotApi,
  ) {}

  async create(reporter: UserRow, reportedUserId: number, reason: string): Promise<ReportRow> {
    const report = await this.reportRepository.create(reporter.id, reportedUserId, reason);
    await this.blacklistService.block(reportedUserId, reporter.id);
    await this.notifyDeveloper(report);
    logger.warn({ event: 'report_created', reportId: report.id, reportedUserId }, 'report');
    return report;
  }

  private async notifyDeveloper(report: ReportRow): Promise<void> {
    await trySend(() =>
      this.api.sendMessage(
        env.DEVELOPER_TELEGRAM_ID,
        render(MESSAGES.ADMIN.REPORT_RECEIVED, {
          reportId: report.id,
          id: report.reportedUserId,
          reason: report.reason,
        }),
        { reply_markup: reportActionsKeyboard(report.id, report.reportedUserId) },
      ),
    );
  }

  async listPending(limit = 20): Promise<ReportRow[]> {
    return this.reportRepository.listPending(limit);
  }

  async findById(id: number): Promise<ReportRow | null> {
    return this.reportRepository.findById(id);
  }

  async resolve(id: number, adminId: number): Promise<ReportRow | null> {
    return this.reportRepository.resolve(id, adminId);
  }

  async remove(id: number, adminId: number): Promise<ReportRow | null> {
    return this.reportRepository.softDelete(id, adminId);
  }

  async hasReported(reporterId: number, reportedUserId: number): Promise<boolean> {
    return this.reportRepository.hasReported(reporterId, reportedUserId);
  }
}
