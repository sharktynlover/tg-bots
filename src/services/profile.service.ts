import { inject, singleton } from 'tsyringe';
import type { InlineKeyboard } from 'grammy';
import { InputMediaBuilder } from 'grammy';
import { BOT_API_TOKEN, type BotApi } from '@/bot';
import { MESSAGES } from '@/messages/ru';
import type { CreateProfileDTO, UpdateProfileDTO } from '@/dto/profile.dto';
import type { UserPhotoRow, UserRow } from '@/entities';
import { UserRepository } from '@/repositories/user.repository';
import { render } from '@/utils/template';
import { escapeHtml, pluralizeYears, trySend } from '@/utils/telegram.utils';

export interface ProfileCard {
  user: UserRow;
  photos: UserPhotoRow[];
  caption: string;
}

@singleton()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    @inject(BOT_API_TOKEN) private readonly api: BotApi,
  ) {}

  async getCard(userId: number): Promise<ProfileCard | null> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isProfileComplete) return null;
    const photos = await this.userRepository.getPhotos(userId);
    return { user, photos, caption: ProfileService.buildCaption(user) };
  }

  static buildCaption(user: UserRow): string {
    const params = {
      name: escapeHtml(user.name ?? ''),
      age: pluralizeYears(user.age ?? 0),
      group: escapeHtml(user.groupName ?? ''),
      description: escapeHtml(user.description ?? ''),
    };
    const template = user.description
      ? MESSAGES.PROFILE.CARD
      : MESSAGES.PROFILE.CARD_NO_DESCRIPTION;
    return render(template, params);
  }

  /**
   * Sends a profile as it is seen by other users: an album of photos followed by
   * a caption message carrying the action keyboard.
   */
  async sendCard(
    chatId: number,
    card: ProfileCard,
    options: { keyboard?: InlineKeyboard; header?: string } = {},
  ): Promise<void> {
    const caption = options.header ? `${options.header}\n\n${card.caption}` : card.caption;

    if (card.photos.length === 1) {
      const photo = card.photos[0];
      if (photo) {
        await trySend(() =>
          this.api.sendPhoto(chatId, photo.photoUrl, {
            caption,
            parse_mode: 'HTML',
            reply_markup: options.keyboard,
          }),
        );
        return;
      }
    }

    if (card.photos.length > 1) {
      await trySend(() =>
        this.api.sendMediaGroup(
          chatId,
          card.photos.map((photo) => InputMediaBuilder.photo(photo.photoUrl)),
        ),
      );
    }

    await trySend(() =>
      this.api.sendMessage(chatId, caption, {
        parse_mode: 'HTML',
        reply_markup: options.keyboard,
      }),
    );
  }

  async createProfile(userId: number, dto: CreateProfileDTO): Promise<UserRow | null> {
    const user = await this.userRepository.update(userId, {
      age: dto.age,
      name: dto.name,
      description: dto.description ?? null,
      groupName: dto.groupName,
      gender: dto.gender,
      searchPreference: dto.searchPreference,
      isProfileComplete: true,
      isHidden: false,
    });
    await this.userRepository.replacePhotos(userId, dto.photos);
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDTO): Promise<UserRow | null> {
    const { photos, ...fields } = dto;
    const user = await this.userRepository.update(userId, fields);
    if (photos) await this.userRepository.replacePhotos(userId, photos);
    return user;
  }

  async setHidden(userId: number, isHidden: boolean): Promise<void> {
    await this.userRepository.update(userId, { isHidden });
  }

  /** Deletes the profile and every like/match through FK cascades; reports survive. */
  async deleteProfile(userId: number): Promise<void> {
    await this.userRepository.delete(userId);
  }
}
