import { InlineKeyboard, Keyboard as ReplyKeyboard } from 'grammy';
import { BUTTONS } from '@/messages/ru';

export function profileMenuKeyboard(isHidden: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(BUTTONS.PROFILE.EDIT, 'profile:edit')
    .text(isHidden ? BUTTONS.PROFILE.SHOW : BUTTONS.PROFILE.HIDE, 'profile:visibility')
    .row()
    .text(BUTTONS.PROFILE.BOOST, 'boost:menu')
    .text(BUTTONS.PROFILE.INVITE, 'referral:menu')
    .row()
    .text(BUTTONS.PROFILE.DELETE, 'profile:delete');
}

export function editMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(BUTTONS.EDIT.AGE, 'profile:edit:age')
    .text(BUTTONS.EDIT.NAME, 'profile:edit:name')
    .row()
    .text(BUTTONS.EDIT.DESCRIPTION, 'profile:edit:description')
    .text(BUTTONS.EDIT.GROUP, 'profile:edit:groupName')
    .row()
    .text(BUTTONS.EDIT.PHOTOS, 'profile:edit:photos')
    .text(BUTTONS.EDIT.SEARCH_PREFERENCE, 'profile:edit:searchPreference')
    .row()
    .text(BUTTONS.PROFILE.REFILL, 'profile:refill');
}

export function genderKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard()
    .text(BUTTONS.GENDER.MALE)
    .text(BUTTONS.GENDER.FEMALE)
    .resized()
    .oneTime();
}

export function searchPreferenceKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard()
    .text(BUTTONS.SEARCH.MALE)
    .text(BUTTONS.SEARCH.FEMALE)
    .row()
    .text(BUTTONS.SEARCH.BOTH)
    .resized()
    .oneTime();
}

export function photosKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard().text(BUTTONS.COMMON.DONE).text(BUTTONS.COMMON.CANCEL).resized();
}

export function skipKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard().text(BUTTONS.COMMON.SKIP).text(BUTTONS.COMMON.CANCEL).resized();
}

export function photoManageKeyboard(
  photos: { id: number }[],
  canAdd: boolean,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  photos.forEach((photo, index) => {
    keyboard.text(`🗑 Фото ${index + 1}`, `photos:delete:${photo.id}`);
    if (index % 2 === 1) keyboard.row();
  });
  keyboard.row();
  if (canAdd) keyboard.text('➕ Добавить фото', 'photos:add').row();
  keyboard.text('🔄 Заменить все', 'photos:replace');
  return keyboard;
}

export function confirmKeyboard(action: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(BUTTONS.COMMON.YES, `${action}:yes`)
    .text(BUTTONS.COMMON.NO, `${action}:no`);
}
