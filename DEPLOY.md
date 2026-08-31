# Запуск на VPS

Гайд для Ubuntu-сервера. Всё крутится в Docker: Bun, PostgreSQL и Redis ставить
на хост не нужно.

## 1. Установить зависимости

```bash
curl -fsSL https://get.docker.com | sh
apt install -y git
```

## 2. Забрать код

```bash
git clone https://github.com/sharktynlover/tg-bots.git ~/date
cd ~/date
```

Обновление позже: `git pull && docker compose up -d --build`.

## 3. Заполнить .env

```bash
cp .env.example .env
nano .env
```

Обязательные значения:

| Переменная | Что вписать |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | токен от @BotFather |
| `DATABASE_URL` | `postgresql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@postgres:5432/dating_db` |
| `REDIS_URL` | `redis://redis:6379` (не менять) |
| `DEVELOPER_TELEGRAM_ID` | ваш Telegram ID (узнать у @userinfobot) |
| `ADMIN_TELEGRAM_IDS` | ID админов через запятую или пусто |

Пароль лучше сгенерировать: `openssl rand -hex 16`. Хосты `postgres` и `redis` —
это имена сервисов в compose, менять их нельзя.

Те же логин/пароль/база должны стоять в `docker-compose.yml`:

```yaml
  postgres:
    environment:
      POSTGRES_USER: ПОЛЬЗОВАТЕЛЬ
      POSTGRES_PASSWORD: ПАРОЛЬ
      POSTGRES_DB: dating_db
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ПОЛЬЗОВАТЕЛЬ -d dating_db']
```

Если Postgres уже стартовал со старым паролем, том нужно пересоздать:
`docker compose down -v` (данные удаляются).

`TELEGRAM_WEBHOOK_URL` оставьте пустым — бот работает через long polling, домен и
сертификат не нужны.

## 4. Если сервер в России

С части российских хостингов `api.telegram.org` не открывается. Проверка:

```bash
TOKEN='ваш_токен'
curl -s --max-time 10 "https://api.telegram.org/bot${TOKEN}/getMe"
```

Если ответа нет — привяжите домен к живому IP Telegram. На хосте:

```bash
echo "149.154.167.220 api.telegram.org" >> /etc/hosts
```

и в `docker-compose.yml` сервисам `bot` и `cron` (контейнеры не видят `/etc/hosts`
хоста):

```yaml
    extra_hosts:
      - "api.telegram.org:149.154.167.220"
```

Проверить, что через этот IP Telegram отвечает:

```bash
curl -s --resolve api.telegram.org:443:149.154.167.220 \
  "https://api.telegram.org/bot${TOKEN}/getMe"    # ждём {"ok":true,...}
unset TOKEN
```

Привязка IP держится, пока этот адрес не заблокируют. Долговременные варианты:

- Cloudflare WARP на хосте (`apt install cloudflare-warp`, `warp-cli registration new`,
  `warp-cli connect`) — тогда ничего в конфиге бота не нужно;
- любой прокси вне РФ — вписать в `TELEGRAM_PROXY_URL` (`http://user:pass@host:port`
  или `socks5://...`);
- собственный Bot API server — вписать его адрес в `TELEGRAM_API_ROOT`.

## 5. Запуск

```bash
docker compose up -d --build
docker compose logs -f bot
```

В логах должно появиться `"event":"bot_started","mode":"polling"`. Миграции
применяются автоматически при старте контейнера.

`401 Unauthorized` — неверный токен. Зависание без строки `bot_started` — Telegram
недоступен, см. шаг 4.

Полезное:

```bash
docker compose ps            # статус
docker compose restart bot   # перезапуск
docker compose down          # остановить
```

## 6. Второй бот на том же VPS

Держите его в отдельной папке со своим `docker-compose.yml`. Тогда сети, тома и
контейнеры у проектов свои. Учтите два момента:

- в этом compose заданы жёсткие `container_name` (`dating-bot`, `dating-cron`,
  `dating-db`, `dating-redis`) — у второго проекта они должны отличаться, иначе
  Docker откажется стартовать с `name is already in use`;
- публикуемые наружу порты не должны совпадать (`3000` у бота в webhook-режиме,
  `5432` и `6379` у баз). Если наружу они не нужны, блоки `ports` у `postgres` и
  `redis` можно убрать — внутри compose-сети сервисы видят друг друга и без них.

## 7. Альтернатива Docker: pm2 на хосте

Если бот в Docker не стартует, можно запустить его напрямую через Bun и pm2, а
базы оставить в контейнерах.

```bash
docker compose up -d postgres redis        # только базы
curl -fsSL https://bun.sh/install | bash   # Bun на хост
source ~/.bashrc
apt install -y nodejs npm && npm i -g pm2

cd ~/date
bun install
```

В `.env` заменить хосты на локальные (вне Docker имена сервисов не резолвятся):

```dotenv
DATABASE_URL=postgresql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@127.0.0.1:5432/dating_db
REDIS_URL=redis://127.0.0.1:6379
LOG_FILE_PATH=./logs/bot.log
```

Запуск:

```bash
bun run db:migrate
pm2 start ecosystem.config.cjs
pm2 logs dating-bot
pm2 save && pm2 startup       # автозапуск после перезагрузки
```

Полезное: `pm2 restart dating-bot`, `pm2 stop all`, `pm2 status`. После `git pull`
достаточно `bun install && pm2 restart all`.

## 8. Если процессор без AVX2

Bun 1.2+ требует AVX2 и на старых/виртуальных CPU (например `QEMU Virtual CPU`)
зависает при первом же импорте пакета, не выдавая ошибки. Проверка:

```bash
grep -m1 -o avx2 /proc/cpuinfo || echo "AVX2 нет"
```

Если AVX2 нет — поставьте последнюю версию с baseline-сборкой:

```bash
curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.38"
export PATH="$HOME/.bun/bin:$PATH"
bun --version        # 1.1.38
rm -f bun.lock && bun install
```

Запускать бота в этом случае нужно на хосте через pm2 (раздел 7): официальный
образ `oven/bun:1.4-alpine` на таком CPU так же зависает.

## 9. После первого запуска

Напишите боту `/start` и заполните анкету. Админ-команды: `/admin`, `/stats`,
`/reports`, `/ban`, `/unban`; разработчику дополнительно `/config` (лимиты на лету),
`/logs`, `/exportdb`.
