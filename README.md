# College Dating Bot

Telegram-бот знакомств для студентов колледжа: анкеты, лента, лайки и суперлайки,
мэтчи с обменом username, анонимные вопросы, рефералы, бусты, жалобы и двухуровневая
админка.

## Стек

Bun · TypeScript (strict) · grammY · tsyringe · PostgreSQL 15 + Drizzle ORM · Redis · node-cron · zod · pino · Docker Compose

## Быстрый старт

```bash
cp .env.example .env      # заполнить TELEGRAM_BOT_TOKEN и DEVELOPER_TELEGRAM_ID
docker compose up -d --build
```

Compose поднимает четыре сервиса: `bot`, `cron`, `postgres`, `redis`.
Миграции применяются командой `bun run db:migrate` (внутри контейнера `bot`).

### Локальная разработка

```bash
bun install
bun run db:migrate        # применить миграции
bun run dev               # бот в режиме long polling
bun run start:cron        # cron-сервис отдельным процессом
bun run typecheck && bun run lint
```

Если задан `TELEGRAM_WEBHOOK_URL`, бот стартует в режиме webhook и слушает
`POST /webhook` (+ `GET /health`) на `PORT`; иначе используется long polling.

## Структура

```
src/
  bot.ts              экземпляр grammY
  main.ts             bootstrap бота
  config/             env (zod), postgres, redis
  core/               DI-контейнер и router по декораторам
  decorators/         @Command, @Callback, @Hears, @On, @Middleware, @Keyboard
  middlewares/        auth, rate-limit, guards (profile/admin/developer), error handler
  controllers/        start, profile, swipe, likes, questions, referral, boost, admin, state
  services/           доменная логика (профиль, матчинг, лайки, бусты, рефералы, ...)
  repositories/       доступ к БД через Drizzle
  entities/           схема БД (13 таблиц)
  messages/           все тексты (ru), в контроллерах и сервисах строк нет
  keyboards/          reply/inline клавиатуры
  cron/               еженедельный сброс суперлайков, истечение бустов, снапшоты статистики
  database/           миграции и раннер
```

## Правила домена

- Возраст 15–25, имя ≤ 100, описание ≤ 150, 1–3 фото, группа обязательна.
- Пол задаётся один раз и не редактируется.
- Скрытая анкета исчезает из ленты, лайки и мэтчи сохраняются; удаление анкеты
  каскадно чистит всё, кроме жалоб.
- Взаимный лайк → мэтч и обмен username; очередь входящих лайков показывает
  суперлайки первыми.
- Жалоба добавляет пару в blacklist, скип — нет.
- Суперлайки: 1 в неделю, сброс в понедельник 00:00.
- Рефералы: первые три приглашённых дают суперлайк, дальше — буст на 6 часов.
- Бусты суммируются (1/6/24 часа).
- Анонимный вопрос можно задать только тому, кого вы ещё не лайкали; ответ
  раскрывает личность отвечающего.

## Роли

`DEVELOPER_TELEGRAM_ID` — разработчик (полный доступ), `ADMIN_TELEGRAM_IDS` и таблица
`admin_roles` — админы. Роли из конфигурации приоритетнее записей в БД.

Админ: `/admin`, `/stats`, `/reports`, `/report`, `/user`, `/ban`, `/unban`, `/deleteuser`.
Разработчик дополнительно: `/addadmin`, `/removeadmin`, `/admins`, `/logs`, `/errors`,
`/config`, `/exportdb`, `/importdb`, `/dropdb CONFIRM`.

Действия админов пишутся в stdout (pino), в файл рядом с `LOG_FILE_PATH` и в таблицу
`admin_logs`.
