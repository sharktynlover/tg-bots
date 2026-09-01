import { InlineKeyboard } from 'grammy';
import { BUTTONS } from '@/messages/ru';

export interface SwipeKeyboardOptions {
  targetId: number;
  canSuperlike: boolean;
  canAskQuestion: boolean;
}

export function swipeKeyboard(options: SwipeKeyboardOptions): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text(BUTTONS.SWIPE.LIKE, `feed:like:${options.targetId}`)
    .text(BUTTONS.SWIPE.SKIP, `feed:skip:${options.targetId}`);

  if (options.canSuperlike) {
    keyboard.text(BUTTONS.SWIPE.SUPERLIKE, `feed:superlike:${options.targetId}`);
  }
  keyboard.row();
  if (options.canAskQuestion) {
    keyboard.text(BUTTONS.SWIPE.QUESTION, `feed:question:${options.targetId}`);
  }
  keyboard.text(BUTTONS.SWIPE.REPORT, `feed:report:${options.targetId}`);
  return keyboard;
}

export function incomingLikeKeyboard(senderId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(BUTTONS.SWIPE.LIKE, `likes:accept:${senderId}`)
    .text(BUTTONS.SWIPE.SKIP, `likes:decline:${senderId}`)
    .row()
    .text(BUTTONS.SWIPE.REPORT, `likes:report:${senderId}`);
}

export function questionKeyboard(questionId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(BUTTONS.QUESTION.ANSWER, `question:answer:${questionId}`)
    .text(BUTTONS.QUESTION.IGNORE, `question:ignore:${questionId}`);
}

export function boostDurationKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('1 час', 'boost:activate:1')
    .text('6 часов', 'boost:activate:6')
    .text('1 день', 'boost:activate:24');
}
