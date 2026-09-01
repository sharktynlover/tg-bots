import { AdminController } from './admin.controller';
import { BoostController } from './boost.controller';
import { LikesController } from './likes.controller';
import { ProfileController } from './profile.controller';
import { QuestionsController } from './questions.controller';
import { ReferralController } from './referral.controller';
import { StartController } from './start.controller';
import { StateController } from './state.controller';
import { SwipeController } from './swipe.controller';

/** Registration order matters: StateController is the catch-all and must stay last. */
export const CONTROLLERS = [
  StartController,
  ProfileController,
  SwipeController,
  LikesController,
  QuestionsController,
  ReferralController,
  BoostController,
  AdminController,
  StateController,
] as const;

export {
  AdminController,
  BoostController,
  LikesController,
  ProfileController,
  QuestionsController,
  ReferralController,
  StartController,
  StateController,
  SwipeController,
};
