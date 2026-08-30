# College Schedule Bot

Telegram-бот расписания УрТТ: расписание группы, следующая пара, предрасписание на следующую
неделю, поиск кабинета, экспорт в календарь, напоминания и рассылки.

Данные берутся из tRPC API колледжа `https://akademiks.urtt.ru/api/trpc/schedule.get`
(расписание группы, преподавателя и кабинета).

## Стек

Bun · TypeScript (strict) · grammY · tsyringe · Drizzle ORM + PostgreSQL 16 · Redis 7 ·
RabbitMQ · node-cron · ical-generator

## Структура

```
apps/bot-gateway       Telegram-бот: контроллеры, клавиатуры, тексты сообщений
apps/schedule-service  Cron: парсинг расписания, предрасписание, напоминания
packages/shared        Типы, конфиги групп/преподавателей/кабинетов, API-клиент, БД, RabbitMQ
```

Сервисы общаются через очереди RabbitMQ: `bot_notifications`, `bot_preschedule`,
`bot_reminders`, `admin_broadcasts`, `schedule_requests`.

## Запуск

```bash
cp .env.example .env      # укажи TELEGRAM_BOT_TOKEN и ADMIN_IDS
docker compose up -d      # postgres, redis, rabbitmq, миграции, оба сервиса
```

Локально без Docker:

```bash
bun install
docker compose up -d postgres redis rabbitmq
bun run db:migrate
bun run dev        # бот
bun run dev:cron   # schedule-service
```

## Команды

| Команда                          | Что делает                                                           |
| -------------------------------- | -------------------------------------------------------------------- |
| `/start`                         | Выбор группы: специальность → курс → группа                          |
| `/schedule`                      | Расписание недели с переключением дней                               |
| `/next`                          | Следующая пара и сколько до неё осталось                             |
| `/preschedule`                   | Предрасписание, собранное из расписаний преподавателей               |
| `/cabinet 365`                   | Этаж, крыло и схема этажа                                            |
| `/export`                        | `.ics` для календаря                                                 |
| `/settings`                      | Напоминания (5/10/15 мин. или выкл.) и формат (подробный/компактный) |
| `/feedback`                      | Сообщение администрации; админ отвечает реплаем                      |
| `/admin`, `/stats`, `/broadcast` | Только для `ADMIN_IDS`                                               |

## Скрипты

```bash
bun run lint
bun run typecheck
bun run db:generate   # миграции Drizzle из схемы
bun run db:migrate
```

## Время

API колледжа отдаёт UTC, сравнение и хранение идут в UTC, форматирование для пользователя и
все cron-задачи — в `Asia/Yekaterinburg`.
