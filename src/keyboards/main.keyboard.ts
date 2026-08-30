import { Keyboard as ReplyKeyboard } from 'grammy';
import { BUTTONS } from '@/messages/ru';

export function mainKeyboard(hasProfile: boolean): ReplyKeyboard {
  const keyboard = new ReplyKeyboard();
  if (hasProfile) {
    keyboard.text(BUTTONS.MAIN.FEED).text(BUTTONS.MAIN.LIKES).row();
    keyboard.text(BUTTONS.MAIN.PROFILE).text(BUTTONS.MAIN.HELP);
  } else {
    keyboard.text(BUTTONS.PROFILE.CREATE).row();
    keyboard.text(BUTTONS.MAIN.HELP);
  }
  return keyboard.resized().persistent();
}

export function cancelKeyboard(): ReplyKeyboard {
  return new ReplyKeyboard().text(BUTTONS.COMMON.CANCEL).resized().oneTime();
}
