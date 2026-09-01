import { pgEnum } from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['male', 'female']);
export const searchPreferenceEnum = pgEnum('search_preference', ['male', 'female', 'both']);
export const likeTypeEnum = pgEnum('like_type', ['like', 'superlike']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'resolved', 'deleted']);
export const rewardTypeEnum = pgEnum('reward_type', ['superlike', 'boost']);
export const boostSourceEnum = pgEnum('boost_source', ['superlikes', 'referral', 'admin']);
export const questionStatusEnum = pgEnum('question_status', ['pending', 'answered', 'ignored']);
export const adminRoleEnum = pgEnum('admin_role', ['admin', 'developer']);

export type Gender = (typeof genderEnum.enumValues)[number];
export type SearchPreference = (typeof searchPreferenceEnum.enumValues)[number];
export type LikeType = (typeof likeTypeEnum.enumValues)[number];
export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
export type RewardType = (typeof rewardTypeEnum.enumValues)[number];
export type BoostSource = (typeof boostSourceEnum.enumValues)[number];
export type QuestionStatus = (typeof questionStatusEnum.enumValues)[number];
export type AdminRole = (typeof adminRoleEnum.enumValues)[number];
