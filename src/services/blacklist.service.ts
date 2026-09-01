import { singleton } from 'tsyringe';
import { ReportRepository } from '@/repositories/report.repository';

@singleton()
export class BlacklistService {
  constructor(private readonly reportRepository: ReportRepository) {}

  /** Hides `userId` from `blockedById`'s feed forever. Only reports trigger this. */
  async block(userId: number, blockedById: number): Promise<void> {
    await this.reportRepository.blacklistAdd(userId, blockedById);
  }

  async isBlocked(userId: number, blockedById: number): Promise<boolean> {
    return this.reportRepository.isBlacklisted(userId, blockedById);
  }
}
