import { singleton } from 'tsyringe';
import type { Gender, SearchPreference } from '@/entities';
import { formatGroupList, resolveGroup } from '@/constants/groups';
import { CreateProfileSchema } from '@/dto/profile.dto';
import {
  genderKeyboard,
  photosKeyboard,
  searchPreferenceKeyboard,
  skipKeyboard,
} from '@/keyboards/profile.keyboard';
import { cancelKeyboard, mainKeyboard } from '@/keyboards/main.keyboard';
import { BUTTONS, MESSAGES } from '@/messages/ru';
import { UserRepository } from '@/repositories/user.repository';
import type { BotContext } from '@/types/context';
import type { EditableField, ProfileDraft } from '@/types/session';
import { render } from '@/utils/template';
import { logger } from '@/utils/logger';
import { ProfileService } from './profile.service';
import { ReferralService } from './referral.service';
import { SettingsService } from './settings.service';

const CREATION_ORDER: (keyof ProfileDraft)[] = [
  'age',
  'name',
  'description',
  'photos',
  'groupName',
  'gender',
  'searchPreference',
];

const GENDER_BY_BUTTON: Record<string, Gender> = {
  [BUTTONS.GENDER.MALE]: 'male',
  [BUTTONS.GENDER.FEMALE]: 'female',
};

const PREFERENCE_BY_BUTTON: Record<string, SearchPreference> = {
  [BUTTONS.SEARCH.MALE]: 'male',
  [BUTTONS.SEARCH.FEMALE]: 'female',
  [BUTTONS.SEARCH.BOTH]: 'both',
};

@singleton()
export class ProfileWizardService {
  constructor(
    private readonly profileService: ProfileService,
    private readonly userRepository: UserRepository,
    private readonly referralService: ReferralService,
    private readonly settingsService: SettingsService,
  ) {}

  async start(ctx: BotContext): Promise<void> {
    await ctx.reply(MESSAGES.PROFILE.START_CREATION, { reply_markup: cancelKeyboard() });
    await ctx.setSession({ step: 'creating', field: 'age', draft: {} });
    await this.prompt(ctx, 'age');
  }

  async startEdit(ctx: BotContext, field: EditableField): Promise<void> {
    await ctx.setSession({ step: 'editing', field, draft: {} });
    await this.prompt(ctx, field);
  }

  private async prompt(ctx: BotContext, field: keyof ProfileDraft): Promise<void> {
    const [minAge, maxAge, maxPhotos, maxDescription] = await Promise.all([
      this.settingsService.get('MIN_AGE'),
      this.settingsService.get('MAX_AGE'),
      this.settingsService.get('MAX_PHOTOS'),
      this.settingsService.get('MAX_DESCRIPTION_LENGTH'),
    ]);

    switch (field) {
      case 'age':
        await ctx.reply(render(MESSAGES.PROFILE.ASK_AGE, { min: minAge, max: maxAge }), {
          reply_markup: cancelKeyboard(),
        });
        break;
      case 'name':
        await ctx.reply(MESSAGES.PROFILE.ASK_NAME, { reply_markup: cancelKeyboard() });
        break;
      case 'description':
        await ctx.reply(render(MESSAGES.PROFILE.ASK_DESCRIPTION, { max: maxDescription }), {
          reply_markup: skipKeyboard(),
        });
        break;
      case 'photos':
        await ctx.reply(render(MESSAGES.PROFILE.ASK_PHOTOS, { max: maxPhotos }), {
          reply_markup: photosKeyboard(),
        });
        break;
      case 'groupName':
        await ctx.reply(render(MESSAGES.PROFILE.ASK_GROUP, { groups: formatGroupList() }), {
          reply_markup: cancelKeyboard(),
        });
        break;
      case 'gender':
        await ctx.reply(MESSAGES.PROFILE.ASK_GENDER, { reply_markup: genderKeyboard() });
        break;
      case 'searchPreference':
        await ctx.reply(MESSAGES.PROFILE.ASK_SEARCH_PREFERENCE, {
          reply_markup: searchPreferenceKeyboard(),
        });
        break;
    }
  }

  /** Consumes one wizard input; returns false when the value was rejected. */
  async handleInput(ctx: BotContext): Promise<void> {
    const session = ctx.session;
    if (session.step !== 'creating' && session.step !== 'editing') return;

    const field = session.field as keyof ProfileDraft;
    const draft: ProfileDraft = { ...session.draft };
    const accepted = await this.applyValue(ctx, field, draft);
    if (!accepted) return;

    if (session.step === 'editing') {
      await this.finishEdit(ctx, field, draft);
      return;
    }

    const nextField = CREATION_ORDER[CREATION_ORDER.indexOf(field) + 1];
    if (!nextField) {
      await this.finishCreation(ctx, draft);
      return;
    }

    await ctx.setSession({ step: 'creating', field: nextField, draft });
    await this.prompt(ctx, nextField);
  }

  private async applyValue(
    ctx: BotContext,
    field: keyof ProfileDraft,
    draft: ProfileDraft,
  ): Promise<boolean> {
    const text = ctx.message?.text?.trim();
    const photo = ctx.message?.photo?.at(-1);

    switch (field) {
      case 'age': {
        const [minAge, maxAge] = await Promise.all([
          this.settingsService.get('MIN_AGE'),
          this.settingsService.get('MAX_AGE'),
        ]);
        const age = Number(text);
        if (!Number.isInteger(age) || age < minAge || age > maxAge) {
          await ctx.reply(render(MESSAGES.PROFILE.INVALID_AGE, { min: minAge, max: maxAge }));
          return false;
        }
        draft.age = age;
        return true;
      }
      case 'name': {
        if (!text) {
          await ctx.reply(MESSAGES.PROFILE.INVALID_NAME);
          return false;
        }
        draft.name = text;
        return true;
      }
      case 'description': {
        const maxDescription = await this.settingsService.get('MAX_DESCRIPTION_LENGTH');
        if (text === BUTTONS.COMMON.SKIP || !text) {
          draft.description = null;
          return true;
        }
        if (text.length > maxDescription) {
          await ctx.reply(render(MESSAGES.PROFILE.INVALID_DESCRIPTION, { max: maxDescription }));
          return false;
        }
        draft.description = text;
        return true;
      }
      case 'photos': {
        const maxPhotos = await this.settingsService.get('MAX_PHOTOS');
        const photos = draft.photos ?? [];

        if (text === BUTTONS.COMMON.DONE) {
          if (photos.length === 0) {
            await ctx.reply(MESSAGES.PROFILE.NEED_PHOTO);
            return false;
          }
          draft.photos = photos;
          return true;
        }
        if (!photo) {
          await ctx.reply(MESSAGES.PROFILE.NOT_A_PHOTO);
          return false;
        }
        if (photos.length >= maxPhotos) {
          await ctx.reply(render(MESSAGES.PROFILE.PHOTO_LIMIT, { max: maxPhotos }));
          return false;
        }

        photos.push(photo.file_id);
        draft.photos = photos;
        await this.persistDraft(ctx, draft);
        await ctx.reply(
          render(MESSAGES.PROFILE.PHOTO_ADDED, { count: photos.length, max: maxPhotos }),
        );
        return false;
      }
      case 'groupName': {
        const group = text ? resolveGroup(text) : null;
        if (!group) {
          await ctx.reply(render(MESSAGES.PROFILE.INVALID_GROUP, { groups: formatGroupList() }));
          return false;
        }
        draft.groupName = group;
        return true;
      }
      case 'gender': {
        const gender = text ? GENDER_BY_BUTTON[text] : undefined;
        if (!gender) {
          await ctx.reply(MESSAGES.PROFILE.ASK_GENDER, { reply_markup: genderKeyboard() });
          return false;
        }
        draft.gender = gender;
        return true;
      }
      case 'searchPreference': {
        const preference = text ? PREFERENCE_BY_BUTTON[text] : undefined;
        if (!preference) {
          await ctx.reply(MESSAGES.PROFILE.ASK_SEARCH_PREFERENCE, {
            reply_markup: searchPreferenceKeyboard(),
          });
          return false;
        }
        draft.searchPreference = preference;
        return true;
      }
    }
  }

  private async persistDraft(ctx: BotContext, draft: ProfileDraft): Promise<void> {
    const session = ctx.session;
    if (session.step !== 'creating' && session.step !== 'editing') return;
    await ctx.setSession({ ...session, draft } as typeof session);
  }

  private async finishCreation(ctx: BotContext, draft: ProfileDraft): Promise<void> {
    const user = ctx.user;
    if (!user) return;

    const parsed = CreateProfileSchema.safeParse(draft);
    if (!parsed.success) {
      logger.warn({ event: 'profile_draft_invalid', userId: user.id }, 'invalid draft');
      await ctx.reply(MESSAGES.COMMON.ERROR);
      await ctx.setSession({ step: 'idle' });
      return;
    }

    const updated = await this.profileService.createProfile(user.id, parsed.data);
    await ctx.setSession({ step: 'idle' });
    await ctx.reply(MESSAGES.PROFILE.CREATED, { reply_markup: mainKeyboard(true) });
    if (updated) await this.referralService.rewardOnProfileCompletion(updated);

    const card = await this.profileService.getCard(user.id);
    if (card) await this.profileService.sendCard(user.id, card, { header: MESSAGES.PROFILE.VIEW_SELF });
    logger.info({ event: 'user_registered', userId: user.id }, 'profile created');
  }

  private async finishEdit(
    ctx: BotContext,
    field: keyof ProfileDraft,
    draft: ProfileDraft,
  ): Promise<void> {
    const user = ctx.user;
    if (!user) return;

    if (field === 'photos' && draft.photos) {
      await this.userRepository.replacePhotos(user.id, draft.photos);
    } else {
      const value = draft[field];
      await this.userRepository.update(user.id, { [field]: value });
    }

    await ctx.setSession({ step: 'idle' });
    await ctx.reply(MESSAGES.PROFILE.UPDATED, { reply_markup: mainKeyboard(true) });
  }
}
