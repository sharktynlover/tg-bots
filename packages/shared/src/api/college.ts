import { env } from '../env';
import { createLogger, toErrorMeta } from '../utils/logger';
import type { ApiLesson, ApiSchedule, Lesson, ScheduleDay, WeekSchedule } from '../types';

const log = createLogger('college-api');

export interface ScheduleQuery {
	groupId?: string | null;
	teacherId?: string | null;
	classroomId?: number | null;
	weekStart: Date;
}

export class CollegeApiError extends Error {}

/**
 * Собирает URL tRPC-запроса `schedule.get`.
 * Superjson-мета помечает `weekStart` как Date, а незаданные фильтры — как undefined.
 */
export function buildScheduleUrl(query: ScheduleQuery, baseUrl = env.collegeApiUrl): string {
	const json: Record<string, unknown> = {
		groupId: query.groupId ?? null,
		teacherId: query.teacherId ?? null,
		classroomId: query.classroomId ?? null,
		weekStart: query.weekStart.toISOString(),
	};
	const values: Record<string, string[]> = { weekStart: ['Date'] };
	for (const key of ['groupId', 'teacherId', 'classroomId'] as const) {
		if (json[key] === null) values[key] = ['undefined'];
	}
	const input = JSON.stringify({ 0: { json, meta: { values, v: 1 } } });
	return `${baseUrl}/api/trpc/schedule.get?batch=1&input=${encodeURIComponent(input)}`;
}

interface TrpcBatchItem {
	result?: { data?: { json?: ApiSchedule } };
	error?: { json?: { message?: string } };
}

async function request(query: ScheduleQuery, timeoutMs = 15_000): Promise<ApiSchedule> {
	const url = buildScheduleUrl(query);
	const response = await fetch(url, {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!response.ok) {
		throw new CollegeApiError(`API колледжа вернул ${response.status}`);
	}
	const body = (await response.json()) as TrpcBatchItem[];
	const item = body[0];
	if (!item) throw new CollegeApiError('Пустой ответ API колледжа');
	if (item.error) throw new CollegeApiError(item.error.json?.message ?? 'Ошибка API колледжа');
	const schedule = item.result?.data?.json;
	if (!schedule) throw new CollegeApiError('Ответ API колледжа без данных');
	return schedule;
}

/** Запрос с повторами: сеть/5xx бывают, а расписание нужно. */
export async function fetchSchedule(query: ScheduleQuery, retries = 2): Promise<ApiSchedule> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			return await request(query);
		} catch (error) {
			lastError = error;
			log.warn('Запрос к API колледжа не удался', {
				attempt,
				query: { ...query, weekStart: query.weekStart.toISOString() },
				...toErrorMeta(error),
			});
			if (attempt < retries)
				await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
		}
	}
	throw lastError instanceof Error ? lastError : new CollegeApiError(String(lastError));
}

export function normalizeLesson(lesson: ApiLesson): Lesson {
	return {
		id: lesson.id,
		title: lesson.title,
		start: lesson.start,
		end: lesson.end,
		index: lesson.index,
		subgroup: lesson.subgroup,
		type: lesson.type,
		teacherId: lesson.teacherId,
		teacherName: lesson.Teacher?.name ?? null,
		groupId: lesson.groupId,
		groupTitle: lesson.Group?.title ?? null,
		classroomId: lesson.classroomId,
		classroomName: lesson.Classroom?.name ?? null,
	};
}

export function normalizeSchedule(schedule: ApiSchedule, weekStart: Date): WeekSchedule {
	const days: ScheduleDay[] = schedule.data.map((day) => ({
		date: day.start,
		lessons: day.lessons
			.map(normalizeLesson)
			.sort((a, b) => a.index - b.index || a.start.localeCompare(b.start)),
	}));
	return { weekStart: weekStart.toISOString(), days };
}

/** Расписание группы на неделю. */
export async function fetchGroupWeek(groupId: string, weekStart: Date): Promise<WeekSchedule> {
	const schedule = await fetchSchedule({ groupId, weekStart });
	return normalizeSchedule(schedule, weekStart);
}

/** Расписание преподавателя на неделю. */
export async function fetchTeacherWeek(teacherId: string, weekStart: Date): Promise<WeekSchedule> {
	const schedule = await fetchSchedule({ teacherId, weekStart });
	return normalizeSchedule(schedule, weekStart);
}

/** Расписание кабинета на неделю. */
export async function fetchClassroomWeek(
	classroomId: number,
	weekStart: Date,
): Promise<WeekSchedule> {
	const schedule = await fetchSchedule({ classroomId, weekStart });
	return normalizeSchedule(schedule, weekStart);
}

export function countLessons(week: WeekSchedule): number {
	return week.days.reduce((total, day) => total + day.lessons.length, 0);
}
