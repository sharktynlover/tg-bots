import { InlineKeyboard } from 'grammy';

export function reportActionsKeyboard(reportId: number, reportedUserId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Рассмотрено', `report:resolve:${reportId}`)
    .text('🗑 Удалить жалобу', `report:delete:${reportId}`)
    .row()
    .text('🚫 Забанить', `report:ban:${reportedUserId}`)
    .text('❌ Удалить анкету', `report:deleteuser:${reportedUserId}`);
}
