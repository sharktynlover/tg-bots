export const ADMIN = {
  PANEL: '🛠 Админ-панель ({role})',
  BANNED: 'Пользователь {id} забанен 🚫',
  UNBANNED: 'Пользователь {id} разбанен ✅',
  USER_DELETED: 'Анкета пользователя {id} удалена.',
  ADMIN_ADDED: 'Пользователь {id} назначен админом.',
  ADMIN_REMOVED: 'Пользователь {id} больше не админ.',
  ADMIN_LIST: 'Админы:\n{list}',
  ADMIN_LIST_EMPTY: 'Админов пока нет.',
  REPORT_RECEIVED: '🔔 Новая жалоба #{reportId} на пользователя {id}\nПричина: {reason}',
  REPORTS_LIST: 'Жалобы:\n{list}',
  REPORTS_EMPTY: 'Нерассмотренных жалоб нет.',
  REPORT_VIEW:
    'Жалоба #{id}\nСтатус: {status}\nНа пользователя: {reported}\nОт: {reporter}\nПричина: {reason}\nСоздана: {createdAt}',
  REPORT_RESOLVED: 'Жалоба #{id} отмечена как рассмотренная.',
  REPORT_DELETED: 'Жалоба #{id} удалена.',
  CONFIG_UPDATED: 'Настройка {key} = {value}',
  CONFIG_LIST: 'Текущие настройки:\n{list}',
  DB_EXPORTED: 'Экспорт БД готов.',
  DB_IMPORTED: 'Импорт БД завершён: {count} записей.',
  DB_DROPPED: 'База данных очищена.',
  DB_DROP_CONFIRM: 'Отправьте /dropdb CONFIRM, чтобы полностью очистить базу.',
  LOGS: 'Последние действия админов:\n{list}',
  LOGS_EMPTY: 'Логи пусты.',
  ERRORS: 'Последние ошибки:\n{list}',
  STATS:
    '📊 Статистика\n\n' +
    'Пользователей: {users}\n' +
    'С заполненной анкетой: {completeProfiles}\n' +
    'Активных за 7 дней: {activeUsers}\n' +
    'Забанено: {bannedUsers}\n' +
    'Скрытых анкет: {hiddenProfiles}\n' +
    'Лайков: {likes}\n' +
    'Суперлайков: {superlikes}\n' +
    'Мэтчей: {matches}\n' +
    'Рефералов: {referrals}\n' +
    'Активных бустов: {activeBoosts}\n' +
    'Вопросов: {questions}\n' +
    'Жалоб (ожидают): {pendingReports}',
} as const;
