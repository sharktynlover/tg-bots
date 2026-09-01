import { singleton } from 'tsyringe';
import { BoostService } from '@/services/boost.service';
import { SuperlikeService } from '@/services/superlike.service';
import { AdminService } from '@/services/admin.service';
import { logger } from '@/utils/logger';

@singleton()
export class CronJobs {
  constructor(
    private readonly superlikeService: SuperlikeService,
    private readonly boostService: BoostService,
    private readonly adminService: AdminService,
  ) {}

  /** Monday 00:00 — everyone gets their weekly superlike allowance back. */
  async resetSuperlikes(): Promise<void> {
    const affected = await this.superlikeService.resetWeekly();
    logger.info({ event: 'cron_superlikes_reset', affected }, 'superlikes reset');
  }

  async expireBoosts(): Promise<void> {
    const affected = await this.boostService.expireOutdated();
    if (affected > 0) logger.info({ event: 'cron_boosts_expired', affected }, 'boosts expired');
  }

  async snapshotStats(): Promise<void> {
    const stats = await this.adminService.snapshotStats();
    logger.info({ event: 'cron_stats_snapshot', users: stats.users }, 'stats snapshot');
  }
}
