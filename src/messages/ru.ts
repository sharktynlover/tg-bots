import { COMMON } from './common';
import { PROFILE } from './profile';
import { LIKES } from './likes';
import { BOOST, QUESTIONS, REFERRAL, REPORTS } from './extras';
import { ERRORS } from './errors';
import { ADMIN } from './admin';

export const MESSAGES = {
  COMMON,
  PROFILE,
  LIKES,
  QUESTIONS,
  REFERRAL,
  BOOST,
  REPORTS,
  ERRORS,
  ADMIN,
} as const;

export const BUTTONS = {
  MAIN: {
    FEED: '🔍 Смотреть анкеты',
    PROFILE: '👤 Профиль',
    LIKES: '❤️ Кто меня лайкнул',
    HELP: 'ℹ️ Помощь',
  },
  PROFILE: {
    CREATE: '✨ Создать анкету',
    EDIT: '✏️ Изменить',
    HIDE: '🙈 Скрыть анкету',
    SHOW: '👀 Показать анкету',
    DELETE: '🗑 Удалить анкету',
    INVITE: '👥 Пригласить друга',
    BOOST: '🚀 Поднять анкету',
    REFILL: '🔄 Заполнить заново',
    BACK: '⬅️ Назад',
  },
  EDIT: {
    AGE: 'Возраст',
    NAME: 'Имя',
    DESCRIPTION: 'Описание',
    PHOTOS: 'Аватарки',
    GROUP: 'Группа',
    SEARCH_PREFERENCE: 'Кого ищу',
  },
  SWIPE: {
    LIKE: '❤️',
    SUPERLIKE: '⭐',
    SKIP: '⏭️',
    REPORT: '⚠️',
    QUESTION: '💬',
  },
  QUESTION: {
    ANSWER: '✍️ Ответить',
    IGNORE: '🙈 Игнорировать',
  },
  GENDER: {
    MALE: '👦 Мальчик',
    FEMALE: '👧 Девочка',
  },
  SEARCH: {
    MALE: '👦 Мальчиков',
    FEMALE: '👧 Девочек',
    BOTH: '👫 Обоих',
  },
  COMMON: {
    DONE: '✅ Готово',
    SKIP: '➡️ Пропустить',
    CANCEL: '❌ Отмена',
    YES: '✅ Да',
    NO: '❌ Нет',
  },
} as const;
