import { singleton } from 'tsyringe';
import { UserRepository } from '@/repositories/user.repository';
import { nextMondayMidnight } from '@/utils/date.utils';
import { SettingsService } from './settings.service';

@singleton()
export class SuperlikeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async available(userId: number): Promise<number> {
    const user = await this.userRepository.findById(userId);
    return user?.superlikesAvailable ?? 0;
  }

  async grant(userId: number, amount = 1): Promise<void> {
    await this.userRepository.grantSuperlikes(userId, amount);
  }

  async consume(userId: number, amount = 1): Promise<boolean> {
    for (let index = 0; index < amount; index += 1) {
      const consumed = await this.userRepository.consumeSuperlike(userId);
      if (!consumed) {
        // Give back what was already taken so the operation stays atomic.
        if (index > 0) await this.userRepository.grantSuperlikes(userId, index);
        return false;
      }
    }
    return true;
  }

  /** Weekly reset: everyone goes back to the configured allowance. */
  async resetWeekly(): Promise<number> {
    const amount = await this.settingsService.get('SUPERLIKES_PER_WEEK');
    return this.userRepository.resetWeeklySuperlikes(amount, nextMondayMidnight());
  }
}
