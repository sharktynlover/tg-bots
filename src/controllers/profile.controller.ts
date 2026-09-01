import { injectable } from 'tsyringe';
import { Callback, Command, Hears, Middleware } from '@/decorators';
import { mainKeyboard } from '@/keyboards/main.keyboard';
import {
  confirmKeyboard,
  editMenuKeyboard,
  photoManageKeyboard,
  photosKeyboard,
  profileMenuKeyboard,
  searchPreferenceKeyboard,
} from '@/keyboards/profile.keyboard';
import { BUTTONS, MESSAGES } from '@/messages/ru';
import { UserRepository } from '@/repositories/user.repository';
import { ProfileService } from '@/services/profile.service';
import { ProfileWizardService } from '@/services/profile-wizard.service';
import { SettingsService } from '@/services/settings.service';
import type { BotContext } from '@/types/context';
import type { EditableField } from '@/types/session';
import { render } from '@/utils/template';

const EDITABLE_FIELDS: EditableField[] = [
  'age',
  'name',
  'description',
  'photos',
  'groupName',
  'searchPreference',
];

@injectable()
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly wizard: ProfileWizardService,
    private readonly userRepository: UserRepository,
    private readonly settingsService: SettingsService,
  ) {}

  @Command('profile')
  @Hears(BUTTONS.MAIN.PROFILE)
  async view(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    if (!user.isProfileComplete) {
      await ctx.reply(MESSAGES.COMMON.NEED_PROFILE, { reply_markup: mainKeyboard(false) });
      return;
    }

    const card = await this.profileService.getCard(user.id);
    if (!card) return;
    await this.profileService.sendCard(user.id, card, {
      header: MESSAGES.PROFILE.VIEW_SELF,
      keyboard: profileMenuKeyboard(user.isHidden),
    });
  }

  @Hears(BUTTONS.PROFILE.CREATE)
  async create(ctx: BotContext): Promise<void> {
    if (ctx.user?.isProfileComplete) {
      await ctx.reply(MESSAGES.PROFILE.ALREADY_EXISTS);
      return;
    }
    await this.wizard.start(ctx);
  }

  @Callback('profile:edit')
  @Middleware('profile')
  async editMenu(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    await ctx.reply(MESSAGES.PROFILE.EDIT_MENU, { reply_markup: editMenuKeyboard() });
  }

  @Callback(/^profile:edit:(\w+)$/)
  @Middleware('profile')
  async editField(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    const field = ctx.match?.[1] as EditableField | undefined;
    if (!field || !EDITABLE_FIELDS.includes(field)) {
      await ctx.reply(MESSAGES.PROFILE.GENDER_LOCKED);
      return;
    }

    if (field === 'photos') {
      await this.photosMenu(ctx);
      return;
    }
    if (field === 'searchPreference') {
      await ctx.reply(MESSAGES.PROFILE.ASK_SEARCH_PREFERENCE, {
        reply_markup: searchPreferenceKeyboard(),
      });
      await ctx.setSession({ step: 'editing', field, draft: {} });
      return;
    }

    await this.wizard.startEdit(ctx, field);
  }

  @Callback('profile:refill')
  @Middleware('profile')
  async refill(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    await this.wizard.start(ctx);
  }

  @Callback('profile:visibility')
  @Middleware('profile')
  async toggleVisibility(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    await ctx.answerCallbackQuery();
    const nextHidden = !user.isHidden;
    await this.profileService.setHidden(user.id, nextHidden);
    await ctx.reply(nextHidden ? MESSAGES.PROFILE.HIDDEN : MESSAGES.PROFILE.SHOWN);
  }

  @Callback('profile:delete')
  @Middleware('profile')
  async deletePrompt(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    await ctx.reply(MESSAGES.PROFILE.DELETE_CONFIRM, {
      reply_markup: confirmKeyboard('profile:delete:confirm'),
    });
  }

  @Callback('profile:delete:confirm:yes')
  @Middleware('profile')
  async deleteConfirm(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    await ctx.answerCallbackQuery();
    await this.profileService.deleteProfile(user.id);
    await ctx.setSession({ step: 'idle' });
    await ctx.reply(MESSAGES.PROFILE.DELETED, { reply_markup: mainKeyboard(false) });
  }

  @Callback('profile:delete:confirm:no')
  async deleteCancel(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    await ctx.reply(MESSAGES.COMMON.CANCELLED);
  }

  @Callback('photos:add')
  @Middleware('profile')
  async addPhoto(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    await ctx.answerCallbackQuery();

    const [photos, maxPhotos] = await Promise.all([
      this.userRepository.getPhotos(user.id),
      this.settingsService.get('MAX_PHOTOS'),
    ]);
    if (photos.length >= maxPhotos) {
      await ctx.reply(render(MESSAGES.PROFILE.PHOTO_LIMIT, { max: maxPhotos }));
      return;
    }

    await ctx.setSession({
      step: 'editing',
      field: 'photos',
      draft: { photos: photos.map((photo) => photo.photoUrl) },
    });
    await ctx.reply(render(MESSAGES.PROFILE.ASK_PHOTOS, { max: maxPhotos }), {
      reply_markup: photosKeyboard(),
    });
  }

  @Callback('photos:replace')
  @Middleware('profile')
  async replacePhotos(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    const maxPhotos = await this.settingsService.get('MAX_PHOTOS');
    await ctx.setSession({ step: 'editing', field: 'photos', draft: { photos: [] } });
    await ctx.reply(render(MESSAGES.PROFILE.ASK_PHOTOS, { max: maxPhotos }), {
      reply_markup: photosKeyboard(),
    });
  }

  @Callback(/^photos:delete:(\d+)$/)
  @Middleware('profile')
  async deletePhoto(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    const photoId = Number(ctx.match?.[1]);
    if (!user || !Number.isInteger(photoId)) return;
    await ctx.answerCallbackQuery();

    const photos = await this.userRepository.getPhotos(user.id);
    if (photos.length <= 1) {
      await ctx.reply(MESSAGES.PROFILE.PHOTO_DELETE_LAST);
      return;
    }

    await this.userRepository.deletePhoto(photoId, user.id);
    await ctx.reply(MESSAGES.PROFILE.PHOTO_DELETED);
    await this.photosMenu(ctx);
  }

  private async photosMenu(ctx: BotContext): Promise<void> {
    const user = ctx.user;
    if (!user) return;
    const [photos, maxPhotos] = await Promise.all([
      this.userRepository.getPhotos(user.id),
      this.settingsService.get('MAX_PHOTOS'),
    ]);
    await ctx.reply(render(MESSAGES.PROFILE.PHOTOS_MENU, { count: photos.length, max: maxPhotos }), {
      reply_markup: photoManageKeyboard(photos, photos.length < maxPhotos),
    });
  }
}
