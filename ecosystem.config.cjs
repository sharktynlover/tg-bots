const bun = process.env.BUN_PATH || `${process.env.HOME}/.bun/bin/bun`;

module.exports = {
  apps: [
    {
      name: 'dating-bot',
      script: 'src/main.ts',
      interpreter: bun,
      cwd: __dirname,
      env: { SERVICE_NAME: 'bot-service', LOG_FILE_PATH: `${__dirname}/logs/bot.log` },
      autorestart: true,
      max_restarts: 20,
    },
    {
      name: 'dating-cron',
      script: 'src/cron/main.ts',
      interpreter: bun,
      cwd: __dirname,
      env: { SERVICE_NAME: 'cron-service', LOG_FILE_PATH: `${__dirname}/logs/cron.log` },
      autorestart: true,
      max_restarts: 20,
    },
  ],
};
