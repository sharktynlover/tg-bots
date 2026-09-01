import { InputFile } from 'grammy';
import { injectable } from 'tsyringe';
import { Callback, Command, Middleware } from '@/decorators';
import { MESSAGES } from '@/messages/ru';
import { AdminService, type DatabaseDump } from '@/services/admin.service';
import { ProfileService } from '@/services/profile.service';
import { ReportService } from '@/services/report.service';
import { SettingsService } from '@/services/settings.service';
import type { BotContext } from '@/types/context';
import { formatDateTime } from '@/utils/date.utils';
import { render } from '@/utils/template';

function args(ctx: BotContext): string[] {
  const raw = typeof ctx.match === 'string' ? ctx.match : '';
  return raw.trim().length > 0 ? raw.trim().split(/\s+/) : [];
}

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

@injectable()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportService: ReportService,
    private readonly profileService: ProfileService,
    private readonly settingsService: SettingsService,
  ) {}

  @Command('admin')
  @Middleware('admin')
  async panel(ctx: BotContext): Promise<void> {
    const commands = [
      '/stats — статистика',
      '/reports — список жалоб',
      '/report <id> — жалоба подробно',
      '/user <id> — анкета пользователя',
      '/ban <id> [причина] — забанить',
      '/unban <id> — разбанить',
      '/deleteuser <id> — удалить анкету',
    ];
    if (ctx.role === 'developer') {
      commands.push(
        '/addadmin <id> — назначить админа',
        '/removeadmin <id> — снять админа',
        '/admins — список админов',
        '/logs — действия админов',
        '/errors — последние ошибки',
        '/config [ключ значение] — настройки',
        '/exportdb, /importdb, /dropdb CONFIRM — база данных',
      );
    }
    await ctx.reply(
      `${render(MESSAGES.ADMIN.PANEL, { role: ctx.role ?? '' })}\n\n${commands.join('\n')}`,
    );
  }

  @Command('stats')
  @Middleware('admin')
  async stats(ctx: BotContext): Promise<void> {
    const stats = await this.adminService.stats();
    await ctx.reply(render(MESSAGES.ADMIN.STATS, { ...stats }));
  }

  @Command('ban')
  @Middleware('admin')
  async ban(ctx: BotContext): Promise<void> {
    const [idArg, ...reasonParts] = args(ctx);
    const targetId = parseId(idArg);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/ban <id> [причина]' }));
      return;
    }
    const reason = reasonParts.join(' ') || null;
    const ok = await this.adminService.ban(ctx.user?.id ?? 0, targetId, reason);
    await ctx.reply(
      ok
        ? render(MESSAGES.ADMIN.BANNED, { id: targetId })
        : render(MESSAGES.ERRORS.USER_NOT_FOUND, { id: targetId }),
    );
  }

  @Command('unban')
  @Middleware('admin')
  async unban(ctx: BotContext): Promise<void> {
    const targetId = parseId(args(ctx)[0]);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/unban <id>' }));
      return;
    }
    const ok = await this.adminService.unban(ctx.user?.id ?? 0, targetId);
    await ctx.reply(
      ok
        ? render(MESSAGES.ADMIN.UNBANNED, { id: targetId })
        : render(MESSAGES.ERRORS.USER_NOT_FOUND, { id: targetId }),
    );
  }

  @Command('deleteuser')
  @Middleware('admin')
  async deleteUser(ctx: BotContext): Promise<void> {
    const targetId = parseId(args(ctx)[0]);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/deleteuser <id>' }));
      return;
    }
    const ok = await this.adminService.deleteUser(ctx.user?.id ?? 0, targetId);
    await ctx.reply(
      ok
        ? render(MESSAGES.ADMIN.USER_DELETED, { id: targetId })
        : render(MESSAGES.ERRORS.USER_NOT_FOUND, { id: targetId }),
    );
  }

  @Command('user')
  @Middleware('admin')
  async viewUser(ctx: BotContext): Promise<void> {
    const targetId = parseId(args(ctx)[0]);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/user <id>' }));
      return;
    }
    const card = await this.profileService.getCard(targetId);
    if (!card) {
      await ctx.reply(render(MESSAGES.ERRORS.USER_NOT_FOUND, { id: targetId }));
      return;
    }
    await this.profileService.sendCard(ctx.user?.id ?? targetId, card, {
      header: `ID: ${card.user.id} @${card.user.username ?? '—'}`,
    });
  }

  @Command('reports')
  @Middleware('admin')
  async reports(ctx: BotContext): Promise<void> {
    const pending = await this.reportService.listPending();
    if (pending.length === 0) {
      await ctx.reply(MESSAGES.ADMIN.REPORTS_EMPTY);
      return;
    }
    const list = pending
      .map((report) => `#${report.id} → ${report.reportedUserId}: ${report.reason}`)
      .join('\n');
    await ctx.reply(render(MESSAGES.ADMIN.REPORTS_LIST, { list }));
  }

  @Command('report')
  @Middleware('admin')
  async report(ctx: BotContext): Promise<void> {
    const reportId = parseId(args(ctx)[0]);
    const report = reportId ? await this.reportService.findById(reportId) : null;
    if (!report) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/report <id>' }));
      return;
    }
    await ctx.reply(
      render(MESSAGES.ADMIN.REPORT_VIEW, {
        id: report.id,
        status: report.status,
        reported: report.reportedUserId,
        reporter: report.reporterId,
        reason: report.reason,
        createdAt: formatDateTime(report.createdAt),
      }),
    );
  }

  @Callback(/^report:resolve:(\d+)$/)
  @Middleware('admin')
  async resolveReport(ctx: BotContext): Promise<void> {
    const reportId = Number(ctx.match?.[1]);
    await ctx.answerCallbackQuery();
    await this.reportService.resolve(reportId, ctx.user?.id ?? 0);
    await this.adminService.logAction({
      adminId: ctx.user?.id ?? 0,
      action: 'resolve_report',
      metadata: { reportId },
    });
    await ctx.reply(render(MESSAGES.ADMIN.REPORT_RESOLVED, { id: reportId }));
  }

  @Callback(/^report:delete:(\d+)$/)
  @Middleware('admin')
  async deleteReport(ctx: BotContext): Promise<void> {
    const reportId = Number(ctx.match?.[1]);
    await ctx.answerCallbackQuery();
    await this.reportService.remove(reportId, ctx.user?.id ?? 0);
    await ctx.reply(render(MESSAGES.ADMIN.REPORT_DELETED, { id: reportId }));
  }

  @Callback(/^report:ban:(\d+)$/)
  @Middleware('admin')
  async banFromReport(ctx: BotContext): Promise<void> {
    const targetId = Number(ctx.match?.[1]);
    await ctx.answerCallbackQuery();
    await this.adminService.ban(ctx.user?.id ?? 0, targetId, 'report');
    await ctx.reply(render(MESSAGES.ADMIN.BANNED, { id: targetId }));
  }

  @Callback(/^report:deleteuser:(\d+)$/)
  @Middleware('admin')
  async deleteUserFromReport(ctx: BotContext): Promise<void> {
    const targetId = Number(ctx.match?.[1]);
    await ctx.answerCallbackQuery();
    await this.adminService.deleteUser(ctx.user?.id ?? 0, targetId);
    await ctx.reply(render(MESSAGES.ADMIN.USER_DELETED, { id: targetId }));
  }

  @Command('addadmin')
  @Middleware('developer')
  async addAdmin(ctx: BotContext): Promise<void> {
    const targetId = parseId(args(ctx)[0]);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/addadmin <id>' }));
      return;
    }
    await this.adminService.addAdmin(ctx.user?.id ?? 0, targetId);
    await ctx.reply(render(MESSAGES.ADMIN.ADMIN_ADDED, { id: targetId }));
  }

  @Command('removeadmin')
  @Middleware('developer')
  async removeAdmin(ctx: BotContext): Promise<void> {
    const targetId = parseId(args(ctx)[0]);
    if (!targetId) {
      await ctx.reply(render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/removeadmin <id>' }));
      return;
    }
    const removed = await this.adminService.removeAdmin(ctx.user?.id ?? 0, targetId);
    await ctx.reply(
      removed
        ? render(MESSAGES.ADMIN.ADMIN_REMOVED, { id: targetId })
        : render(MESSAGES.ERRORS.USER_NOT_FOUND, { id: targetId }),
    );
  }

  @Command('admins')
  @Middleware('developer')
  async admins(ctx: BotContext): Promise<void> {
    const roles = await this.adminService.listAdmins();
    if (roles.length === 0) {
      await ctx.reply(MESSAGES.ADMIN.ADMIN_LIST_EMPTY);
      return;
    }
    const list = roles.map((role) => `${role.userId} — ${role.role}`).join('\n');
    await ctx.reply(render(MESSAGES.ADMIN.ADMIN_LIST, { list }));
  }

  @Command('logs')
  @Middleware('developer')
  async logs(ctx: BotContext): Promise<void> {
    const entries = await this.adminService.listLogs();
    if (entries.length === 0) {
      await ctx.reply(MESSAGES.ADMIN.LOGS_EMPTY);
      return;
    }
    const list = entries
      .map(
        (entry) =>
          `${formatDateTime(entry.createdAt)} ${entry.adminId} ${entry.action} ${
            entry.targetUserId ?? ''
          }`,
      )
      .join('\n');
    await ctx.reply(render(MESSAGES.ADMIN.LOGS, { list }));
  }

  @Command('errors')
  @Middleware('developer')
  async errors(ctx: BotContext): Promise<void> {
    const entries = await this.adminService.listErrors();
    await ctx.reply(
      render(MESSAGES.ADMIN.ERRORS, { list: entries.join('\n') || MESSAGES.ADMIN.LOGS_EMPTY }),
    );
  }

  @Command('config')
  @Middleware('developer')
  async config(ctx: BotContext): Promise<void> {
    const [key, rawValue] = args(ctx);
    if (!key) {
      const all = await this.settingsService.all();
      const list = Object.entries(all)
        .map(([name, value]) => `${name} = ${value}`)
        .join('\n');
      await ctx.reply(render(MESSAGES.ADMIN.CONFIG_LIST, { list }));
      return;
    }

    const value = Number(rawValue);
    if (!SettingsService.isSettingKey(key) || !Number.isFinite(value)) {
      await ctx.reply(
        render(MESSAGES.ERRORS.INVALID_ARGUMENTS, { usage: '/config <ключ> <число>' }),
      );
      return;
    }

    await this.settingsService.set(key, value);
    await this.adminService.logAction({
      adminId: ctx.user?.id ?? 0,
      action: 'config_update',
      metadata: { key, value },
    });
    await ctx.reply(render(MESSAGES.ADMIN.CONFIG_UPDATED, { key, value }));
  }

  @Command('exportdb')
  @Middleware('developer')
  async exportDb(ctx: BotContext): Promise<void> {
    const dump = await this.adminService.exportDatabase();
    const payload = new TextEncoder().encode(JSON.stringify(dump, null, 2));
    await ctx.replyWithDocument(
      new InputFile(payload, `dump-${new Date().toISOString().slice(0, 10)}.json`),
      { caption: MESSAGES.ADMIN.DB_EXPORTED },
    );
    await this.adminService.logAction({ adminId: ctx.user?.id ?? 0, action: 'export_db' });
  }

  @Command('importdb')
  @Middleware('developer')
  async importDb(ctx: BotContext): Promise<void> {
    const document = ctx.message?.reply_to_message?.document;
    if (!document) {
      await ctx.reply(
        render(MESSAGES.ERRORS.INVALID_ARGUMENTS, {
          usage: '/importdb в ответ на файл дампа .json',
        }),
      );
      return;
    }

    const file = await ctx.api.getFile(document.file_id);
    const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path ?? ''}`;
    const response = await fetch(url);
    const dump = (await response.json()) as DatabaseDump;
    const imported = await this.adminService.importDatabase(ctx.user?.id ?? 0, dump);
    await ctx.reply(render(MESSAGES.ADMIN.DB_IMPORTED, { count: imported }));
  }

  @Command('dropdb')
  @Middleware('developer')
  async dropDb(ctx: BotContext): Promise<void> {
    if (args(ctx)[0] !== 'CONFIRM') {
      await ctx.reply(MESSAGES.ADMIN.DB_DROP_CONFIRM);
      return;
    }
    await this.adminService.dropDatabase(ctx.user?.id ?? 0);
    await ctx.reply(MESSAGES.ADMIN.DB_DROPPED);
  }
}
