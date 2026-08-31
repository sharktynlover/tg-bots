# Деплой бота расписания на VPS рядом с другим ботом

Инструкция рассчитана на сервер, где уже работает бот знакомств: Postgres и Redis
переиспользуются из его контейнеров, поднимается только RabbitMQ. Сервисы бота
запускаются на хосте через Bun + systemd (в контейнерах на CPU без AVX2 Bun зависает).

## 1. Код

```bash
cd ~
git clone https://github.com/sharktynlover/tg-bots.git rasp
cd rasp
git checkout devin/1788116148-schedule-bot
```

## 2. Bun

Нужен Bun 1.1.38: версии 1.2+ требуют AVX2 и на виртуальных CPU зависают при
первом импорте пакета.

```bash
grep -m1 -o avx2 /proc/cpuinfo || curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.38"
export PATH="$HOME/.bun/bin:$PATH"
bun --version
cd ~/rasp && rm -f bun.lock && bun install
```

## 3. Инфраструктура

Отдельная база в уже работающем Postgres и брокер очередей:

```bash
docker exec -i dating-db psql -U case -c 'CREATE DATABASE college;'
cd ~/rasp && docker compose -f docker-compose.host.yml up -d
docker ps --format '{{.Names}}\t{{.Status}}'
```

Redis используется общий, но с отдельной логической базой (`/1`), чтобы состояния
диалогов двух ботов не пересекались.

## 4. Переменные окружения

```bash
cd ~/rasp && cp .env.example .env && vim .env
```

```dotenv
TELEGRAM_BOT_TOKEN=токен_второго_бота
ADMIN_IDS=5206203654
DATABASE_URL=postgres://case:casepass123@127.0.0.1:5432/college
REDIS_URL=redis://127.0.0.1:6379/1
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
COLLEGE_API_URL=https://akademiks.urtt.ru
TZ=Asia/Yekaterinburg
LOG_LEVEL=info
```

Токен должен быть **другой**, чем у бота знакомств: один токен нельзя опрашивать
двумя процессами, Telegram будет отдавать ошибку 409.

Если сервер в РФ и Telegram напрямую недоступен, нужна запись в `/etc/hosts`:

```bash
grep telegram /etc/hosts || echo '149.154.167.220 api.telegram.org' >> /etc/hosts
```

## 5. Миграции и проверка

```bash
cd ~/rasp
bun run db:migrate
timeout 60 bun run apps/bot-gateway/src/main.ts
```

Второй командой бот запускается в терминале: должны появиться строки о подключении
к RabbitMQ и старте бота, после чего в Telegram работает `/start`. Прерывается Ctrl+C.

## 6. Автозапуск через systemd

Юниты рассчитаны на каталог `/root/rasp` и Bun в `/root/.bun/bin/bun`.

```bash
cd ~/rasp
cp deploy/systemd/rasp-bot.service deploy/systemd/rasp-schedule.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now rasp-bot rasp-schedule
systemctl status rasp-bot --no-pager | head -15
journalctl -u rasp-bot -n 30 --no-pager
```

Обновление после изменений в репозитории:

```bash
cd ~/rasp && git pull && bun install
systemctl restart rasp-bot rasp-schedule
```

## 7. Ресурсы

На 1 CPU / 2 ГБ RAM рядом с ботом знакомств суммарно работают Postgres, Redis,
RabbitMQ и четыре Bun-процесса. Обязательно должен быть включён swap:

```bash
free -h    # строка Swap не должна быть нулевой
```

Если процессы начинают зависать, сначала проверьте `top` — на этом сервере уже
случалось, что старый Bun-процесс продолжал крутиться после Ctrl+C и забирал весь CPU:

```bash
ps -ef | grep '[b]un'
```
