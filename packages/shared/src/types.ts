/** Сырой урок в ответе API колледжа. */
export interface ApiLesson {
	id: number;
	title: string;
	start: string;
	end: string;
	index: number;
	subgroup: number | null;
	type: string | null;
	teacherId: string | null;
	groupId: string | null;
	startDay: string;
	classroomId: number | null;
	shouldDisplayForStudents: boolean;
	Teacher?: { id: string; name: string } | null;
	Group?: { id: string; title: string } | null;
	Classroom?: { id: number; name: string; isHidden: boolean; address: string } | null;
}

export interface ApiDay {
	start: string;
	lessons: ApiLesson[];
}

export type ScheduleKind = 'student' | 'teacher' | 'classroom';

export interface ApiSchedule {
	type: ScheduleKind;
	data: ApiDay[];
	group?: { id: string; title: string; additionalId: string | null };
	teacher?: { id: string; name: string };
	classroom?: { id: number; name: string; isHidden: boolean; address: string };
}

/** Нормализованный урок, который хранится в кэше и отдаётся боту. */
export interface Lesson {
	id: number;
	title: string;
	/** ISO 8601, UTC. */
	start: string;
	/** ISO 8601, UTC. */
	end: string;
	index: number;
	subgroup: number | null;
	type: string | null;
	teacherId: string | null;
	teacherName: string | null;
	groupId: string | null;
	groupTitle: string | null;
	classroomId: number | null;
	classroomName: string | null;
	/** Другие группы, у которых эта же пара с тем же преподавателем в это же время. */
	sharedWith?: SharedGroup[];
}

/** `combined` — тот же кабинет (совмещённая), `parallel` — разные кабинеты. */
export interface SharedGroup {
	groupApiId: string;
	groupTitle: string;
	mode: 'combined' | 'parallel';
}

export interface ScheduleDay {
	/** ISO 8601, UTC — начало учебного дня (00:00 по Екатеринбургу). */
	date: string;
	lessons: Lesson[];
}

export interface WeekSchedule {
	/** ISO 8601, UTC — понедельник 00:00 по Екатеринбургу. */
	weekStart: string;
	days: ScheduleDay[];
}

export type ScheduleFormat = 'detailed' | 'compact';

/** Конкретное изменение в расписании группы. */
export type ScheduleChange =
	| { kind: 'added'; after: Lesson; before?: undefined }
	| { kind: 'cancelled'; before: Lesson; after?: undefined }
	| { kind: 'moved'; before: Lesson; after: Lesson }
	| { kind: 'changed'; before: Lesson; after: Lesson };

export interface NotificationEvent {
	groupApiId: string;
	weekStart: string;
	kind: 'schedule' | 'preschedule';
	changes?: ScheduleChange[];
}

export interface ReminderEvent {
	groupApiId: string;
	/** За сколько минут до начала пары сгенерировано событие: 5, 10 или 15. */
	offset: number;
	lesson: Lesson;
}

export interface ScheduleRequestEvent {
	groupApiId: string;
}

export interface BroadcastEvent {
	text: string;
	/** Если пусто — рассылка всем пользователям. */
	groupApiIds?: string[];
	/** Telegram id администратора, инициировавшего рассылку. */
	adminId: number;
}
