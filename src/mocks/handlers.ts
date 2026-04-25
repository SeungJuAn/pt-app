import { http, HttpResponse } from 'msw';
import { db } from './db';
import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  CreateAppointmentDto,
  CreateEnrollmentDto,
  CreateMemberDto,
  Enrollment,
  EnrollmentStatus,
  Member,
  MemberGender,
  MemberLevel,
  UpdateAppointmentDto,
  UpdateEnrollmentDto,
  UpdateMemberDto,
} from '../types';

type EnrollmentWithMember = Enrollment & { memberId: string };
type SessionWithMeta = import('../types').Session & {
  memberId: string;
  enrollmentId: string;
};

const API =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function computeLevelFor(memberId: string): {
  level: MemberLevel;
  enrollmentCount: number;
  activeEnrollmentCount: number;
} {
  const forMember = (db.enrollments as EnrollmentWithMember[]).filter(
    (e) => e.memberId === memberId,
  );
  const enrollmentCount = forMember.length;
  const activeEnrollmentCount = forMember.filter(
    (e) => e.status === 'ACTIVE',
  ).length;
  const level: MemberLevel =
    enrollmentCount === 0
      ? 'CONSULTATION'
      : activeEnrollmentCount > 0
        ? 'ACTIVE'
        : 'DORMANT';
  return { level, enrollmentCount, activeEnrollmentCount };
}

function memberWithLevel(m: Member) {
  return { ...m, ...computeLevelFor(m.id) };
}

function enrichEnrollment(e: EnrollmentWithMember): Enrollment {
  const member = db.members.find((m) => m.id === e.memberId) ?? undefined;
  const { memberId: _memberId, ...rest } = e;
  void _memberId;
  return { ...rest, member };
}

export const handlers = [
  // ===== Members =====
  http.get(`${API}/members`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('pageSize') ?? 10)),
    );
    const level = url.searchParams.get('level') as MemberLevel | null;

    let filtered = db.members.slice();
    if (q) {
      filtered = filtered.filter((m) =>
        [m.name, m.phone, m.occupation, m.memo]
          .filter((v): v is string => !!v)
          .some((v) => v.toLowerCase().includes(q)),
      );
    }
    let withLevel = filtered.map(memberWithLevel);
    if (level && ['CONSULTATION', 'ACTIVE', 'DORMANT'].includes(level)) {
      withLevel = withLevel.filter((m) => m.level === level);
    }
    withLevel.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = withLevel.length;
    const start = (page - 1) * pageSize;
    const items = withLevel.slice(start, start + pageSize);
    return HttpResponse.json({ items, total, page, pageSize });
  }),

  http.get(`${API}/members/:id`, ({ params }) => {
    const m = db.members.find((x) => x.id === params.id);
    if (!m) {
      return HttpResponse.json(
        { message: '회원을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return HttpResponse.json(memberWithLevel(m));
  }),

  http.post(`${API}/members`, async ({ request }) => {
    const dto = (await request.json()) as CreateMemberDto;
    if (!dto.name || !dto.name.trim()) {
      return HttpResponse.json(
        { message: '이름을 입력하세요' },
        { status: 400 },
      );
    }
    const m: Member = {
      id: uuid(),
      name: dto.name.trim(),
      gender: (dto.gender as MemberGender | undefined) ?? null,
      age: dto.age ?? null,
      occupation: dto.occupation ?? null,
      ptExperience: dto.ptExperience ?? null,
      phone: dto.phone ?? null,
      memo: dto.memo ?? null,
      createdAt: new Date().toISOString(),
    };
    db.members.push(m);
    return HttpResponse.json(m, { status: 201 });
  }),

  http.patch(`${API}/members/:id`, async ({ params, request }) => {
    const i = db.members.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '회원을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const dto = (await request.json()) as UpdateMemberDto;
    const m = db.members[i];
    db.members[i] = {
      ...m,
      name: dto.name ?? m.name,
      gender: dto.gender !== undefined ? dto.gender ?? null : m.gender,
      age: dto.age !== undefined ? dto.age ?? null : m.age,
      occupation:
        dto.occupation !== undefined ? dto.occupation ?? null : m.occupation,
      ptExperience:
        dto.ptExperience !== undefined
          ? dto.ptExperience ?? null
          : m.ptExperience,
      phone: dto.phone !== undefined ? dto.phone ?? null : m.phone,
      memo: dto.memo !== undefined ? dto.memo ?? null : m.memo,
    };
    return HttpResponse.json(memberWithLevel(db.members[i]));
  }),

  http.delete(`${API}/members/:id`, ({ params }) => {
    const i = db.members.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '회원을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    db.members.splice(i, 1);
    // cascade cleanup
    db.enrollments = (db.enrollments as EnrollmentWithMember[]).filter(
      (e) => e.memberId !== params.id,
    );
    db.appointments = db.appointments.filter(
      (a) => a.member?.id !== params.id,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== Enrollments =====
  http.get(`${API}/enrollments`, ({ request }) => {
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    let list = db.enrollments as EnrollmentWithMember[];
    if (memberId) {
      list = list.filter((e) => e.memberId === memberId);
    }
    const sorted = list
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(enrichEnrollment);
    return HttpResponse.json(sorted);
  }),

  http.get(`${API}/enrollments/:id`, ({ params }) => {
    const e = (db.enrollments as EnrollmentWithMember[]).find(
      (x) => x.id === params.id,
    );
    if (!e) {
      return HttpResponse.json(
        { message: '등록권을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return HttpResponse.json(enrichEnrollment(e));
  }),

  http.post(`${API}/enrollments`, async ({ request }) => {
    const dto = (await request.json()) as CreateEnrollmentDto;
    if (!dto.memberId || !db.members.some((m) => m.id === dto.memberId)) {
      return HttpResponse.json(
        { message: '회원을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const startedAt =
      dto.startedAt ?? new Date().toISOString().slice(0, 10);
    const e: EnrollmentWithMember = {
      id: uuid(),
      memberId: dto.memberId,
      totalSessions: dto.totalSessions,
      startedAt,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      usedSessions: 0,
    };
    db.enrollments.push(e);
    return HttpResponse.json(enrichEnrollment(e), { status: 201 });
  }),

  http.patch(`${API}/enrollments/:id`, async ({ params, request }) => {
    const list = db.enrollments as EnrollmentWithMember[];
    const i = list.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '등록권을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const dto = (await request.json()) as UpdateEnrollmentDto;
    const prev = list[i];
    const updated: EnrollmentWithMember = {
      ...prev,
      totalSessions: dto.totalSessions ?? prev.totalSessions,
      startedAt: dto.startedAt ?? prev.startedAt,
      status: (dto.status as EnrollmentStatus | undefined) ?? prev.status,
    };
    list[i] = updated;
    return HttpResponse.json(enrichEnrollment(updated));
  }),

  http.delete(`${API}/enrollments/:id`, ({ params }) => {
    const list = db.enrollments as EnrollmentWithMember[];
    const i = list.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '등록권을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    list.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== Sessions =====
  http.get(`${API}/sessions`, ({ request }) => {
    const url = new URL(request.url);
    const memberId = url.searchParams.get('memberId');
    const enrollmentId = url.searchParams.get('enrollmentId');
    let list = db.sessions as SessionWithMeta[];
    if (memberId) list = list.filter((s) => s.memberId === memberId);
    if (enrollmentId)
      list = list.filter((s) => s.enrollmentId === enrollmentId);
    const sorted = list
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(({ memberId: _m, enrollmentId: _e, ...rest }) => {
        void _m;
        void _e;
        return rest;
      });
    return HttpResponse.json(sorted);
  }),

  http.get(`${API}/sessions/:id`, ({ params }) => {
    const list = db.sessions as SessionWithMeta[];
    const s = list.find((x) => x.id === params.id);
    if (!s) {
      return HttpResponse.json(
        { message: '세션을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const enrollment = (db.enrollments as EnrollmentWithMember[]).find(
      (e) => e.id === s.enrollmentId,
    );
    const member = enrollment
      ? db.members.find((m) => m.id === enrollment.memberId) ?? undefined
      : undefined;
    const { memberId: _m, enrollmentId: _e, ...rest } = s;
    void _m;
    void _e;
    return HttpResponse.json({
      ...rest,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            totalSessions: enrollment.totalSessions,
            startedAt: enrollment.startedAt,
            status: enrollment.status,
            createdAt: enrollment.createdAt,
            usedSessions: enrollment.usedSessions,
            member,
          }
        : undefined,
    });
  }),

  http.post(`${API}/sessions`, async ({ request }) => {
    const dto = (await request.json()) as {
      enrollmentId: string;
      date: string;
      dayNumber?: number;
      note?: string;
      performance?: 'GOOD' | 'NORMAL' | 'BAD';
      dailyCheck?: Partial<import('../types').DailyCheck>;
      bodyMetric?: Partial<import('../types').BodyMetric>;
      exerciseEntries: Array<{
        exerciseId: string;
        bodyPartId?: string;
        order: number;
        sets: Array<{
          setNumber: number;
          weightKg?: string;
          reps: number;
        }>;
      }>;
    };
    const enr = (db.enrollments as EnrollmentWithMember[]).find(
      (e) => e.id === dto.enrollmentId,
    );
    if (!enr) {
      return HttpResponse.json(
        { message: '등록권을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const sessionsForEnr = (db.sessions as SessionWithMeta[]).filter(
      (s) => s.enrollmentId === dto.enrollmentId,
    );
    const dayNumber = dto.dayNumber ?? sessionsForEnr.length + 1;
    const entries = (dto.exerciseEntries ?? []).map((e) => {
      const exercise =
        db.exercises.find((x) => x.id === e.exerciseId) ?? {
          id: e.exerciseId,
          name: '알 수 없는 운동',
          cautionTemplate: null,
          defaultBodyPart: null,
          createdAt: new Date().toISOString(),
        };
      const bodyPart = e.bodyPartId
        ? db.bodyParts.find((b) => b.id === e.bodyPartId) ?? null
        : exercise.defaultBodyPart;
      return {
        id: uuid(),
        order: e.order,
        exercise,
        bodyPart,
        sets: e.sets.map((s) => ({
          id: uuid(),
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? '0',
          reps: s.reps,
        })),
      };
    });
    const saved: SessionWithMeta = {
      id: uuid(),
      memberId: enr.memberId,
      enrollmentId: dto.enrollmentId,
      dayNumber,
      date: dto.date,
      note: dto.note ?? null,
      performance: dto.performance ?? null,
      createdAt: new Date().toISOString(),
      dailyCheck: {
        sleep: dto.dailyCheck?.sleep ?? false,
        diet: dto.dailyCheck?.diet ?? false,
        alcoholFree: dto.dailyCheck?.alcoholFree ?? false,
        defecation: dto.dailyCheck?.defecation ?? false,
        hydration: dto.dailyCheck?.hydration ?? false,
        condition: dto.dailyCheck?.condition ?? null,
        cardioMinutes: dto.dailyCheck?.cardioMinutes ?? 0,
        steps: dto.dailyCheck?.steps ?? 0,
      },
      bodyMetric: {
        weightKg: dto.bodyMetric?.weightKg ?? '0',
        skeletalMuscleKg: dto.bodyMetric?.skeletalMuscleKg ?? '0',
        bodyFatKg: dto.bodyMetric?.bodyFatKg ?? '0',
        bodyFatPercent: dto.bodyMetric?.bodyFatPercent ?? '0',
      },
      exerciseEntries: entries,
    };
    (db.sessions as SessionWithMeta[]).push(saved);
    // usedSessions도 반영
    enr.usedSessions = (enr.usedSessions ?? 0) + 1;
    const { memberId: _mid, enrollmentId: _eid, ...response } = saved;
    void _mid;
    void _eid;
    return HttpResponse.json(response, { status: 201 });
  }),

  http.patch(`${API}/sessions/:id`, async ({ params, request }) => {
    const list = db.sessions as SessionWithMeta[];
    const i = list.findIndex((s) => s.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '세션을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const dto = (await request.json()) as {
      date?: string;
      dayNumber?: number;
      note?: string | null;
      performance?: 'GOOD' | 'NORMAL' | 'BAD' | null;
      dailyCheck?: Partial<import('../types').DailyCheck>;
      bodyMetric?: Partial<import('../types').BodyMetric>;
      exerciseEntries?: Array<{
        exerciseId: string;
        bodyPartId?: string;
        order: number;
        sets: Array<{
          setNumber: number;
          weightKg?: string;
          reps: number;
        }>;
      }>;
    };
    const prev = list[i];
    const updated: SessionWithMeta = {
      ...prev,
      date: dto.date ?? prev.date,
      dayNumber: dto.dayNumber ?? prev.dayNumber,
      note: dto.note !== undefined ? dto.note ?? null : prev.note,
      performance:
        dto.performance !== undefined ? dto.performance ?? null : prev.performance,
      dailyCheck: dto.dailyCheck
        ? {
            sleep: dto.dailyCheck.sleep ?? prev.dailyCheck.sleep,
            diet: dto.dailyCheck.diet ?? prev.dailyCheck.diet,
            alcoholFree:
              dto.dailyCheck.alcoholFree ?? prev.dailyCheck.alcoholFree,
            defecation:
              dto.dailyCheck.defecation ?? prev.dailyCheck.defecation,
            hydration: dto.dailyCheck.hydration ?? prev.dailyCheck.hydration,
            condition:
              dto.dailyCheck.condition !== undefined
                ? dto.dailyCheck.condition ?? null
                : prev.dailyCheck.condition,
            cardioMinutes:
              dto.dailyCheck.cardioMinutes ?? prev.dailyCheck.cardioMinutes,
            steps: dto.dailyCheck.steps ?? prev.dailyCheck.steps,
          }
        : prev.dailyCheck,
      bodyMetric: dto.bodyMetric
        ? {
            weightKg: dto.bodyMetric.weightKg ?? prev.bodyMetric.weightKg,
            skeletalMuscleKg:
              dto.bodyMetric.skeletalMuscleKg ??
              prev.bodyMetric.skeletalMuscleKg,
            bodyFatKg:
              dto.bodyMetric.bodyFatKg ?? prev.bodyMetric.bodyFatKg,
            bodyFatPercent:
              dto.bodyMetric.bodyFatPercent ?? prev.bodyMetric.bodyFatPercent,
          }
        : prev.bodyMetric,
      exerciseEntries: dto.exerciseEntries
        ? dto.exerciseEntries.map((e) => {
            const exercise =
              db.exercises.find((x) => x.id === e.exerciseId) ?? {
                id: e.exerciseId,
                name: '알 수 없는 운동',
                cautionTemplate: null,
                defaultBodyPart: null,
                createdAt: new Date().toISOString(),
              };
            const bodyPart = e.bodyPartId
              ? db.bodyParts.find((b) => b.id === e.bodyPartId) ?? null
              : exercise.defaultBodyPart;
            return {
              id: uuid(),
              order: e.order,
              exercise,
              bodyPart,
              sets: e.sets.map((s) => ({
                id: uuid(),
                setNumber: s.setNumber,
                weightKg: s.weightKg ?? '0',
                reps: s.reps,
              })),
            };
          })
        : prev.exerciseEntries,
    };
    list[i] = updated;
    const { memberId: _m, enrollmentId: _e, ...rest } = updated;
    void _m;
    void _e;
    return HttpResponse.json(rest);
  }),

  http.delete(`${API}/sessions/:id`, ({ params }) => {
    const list = db.sessions as SessionWithMeta[];
    const i = list.findIndex((s) => s.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '세션을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const removed = list[i];
    list.splice(i, 1);
    const enr = (db.enrollments as EnrollmentWithMember[]).find(
      (e) => e.id === removed.enrollmentId,
    );
    if (enr && enr.usedSessions) {
      enr.usedSessions = Math.max(0, enr.usedSessions - 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // ===== Body parts / Exercises =====
  http.get(`${API}/body-parts`, () => HttpResponse.json(db.bodyParts)),
  http.get(`${API}/exercises`, () => HttpResponse.json(db.exercises)),

  // ===== Appointments =====
  http.get(`${API}/appointments`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let list = db.appointments.slice();
    if (from && to) {
      const fromMs = Date.parse(from);
      const toMs = Date.parse(to);
      list = list.filter((a) => {
        const t = Date.parse(a.startAt);
        return t >= fromMs && t <= toMs;
      });
    }
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return HttpResponse.json(list);
  }),

  http.get(`${API}/appointments/:id`, ({ params }) => {
    const a = db.appointments.find((x) => x.id === params.id);
    if (!a) {
      return HttpResponse.json(
        { message: '일정을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return HttpResponse.json(a);
  }),

  http.post(`${API}/appointments`, async ({ request }) => {
    const dto = (await request.json()) as CreateAppointmentDto;
    const member =
      (dto.memberId && db.members.find((m) => m.id === dto.memberId)) || null;
    const a: Appointment = {
      id: uuid(),
      member,
      startAt: dto.startAt,
      durationMin: dto.durationMin ?? 60,
      kind: (dto.kind as AppointmentKind | undefined) ?? 'SESSION',
      status: 'SCHEDULED',
      note: dto.note ?? null,
      createdAt: new Date().toISOString(),
    };
    db.appointments.push(a);
    return HttpResponse.json(a, { status: 201 });
  }),

  http.patch(`${API}/appointments/:id`, async ({ params, request }) => {
    const i = db.appointments.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '일정을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    const dto = (await request.json()) as UpdateAppointmentDto;
    const prev = db.appointments[i];
    let member = prev.member;
    if (dto.memberId !== undefined) {
      member = dto.memberId
        ? db.members.find((m) => m.id === dto.memberId) ?? null
        : null;
    }
    db.appointments[i] = {
      ...prev,
      member,
      startAt: dto.startAt ?? prev.startAt,
      durationMin: dto.durationMin ?? prev.durationMin,
      kind: (dto.kind as AppointmentKind | undefined) ?? prev.kind,
      status: (dto.status as AppointmentStatus | undefined) ?? prev.status,
      note: dto.note !== undefined ? dto.note ?? null : prev.note,
    };
    return HttpResponse.json(db.appointments[i]);
  }),

  http.delete(`${API}/appointments/:id`, ({ params }) => {
    const i = db.appointments.findIndex((x) => x.id === params.id);
    if (i < 0) {
      return HttpResponse.json(
        { message: '일정을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    db.appointments.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // trainer/me — used nowhere yet but provide a stub
  http.get(`${API}/trainer/me`, () =>
    HttpResponse.json({
      id: 'demo-trainer',
      loginId: 'demo',
      name: '데모 트레이너',
      email: 'demo@pt-app.local',
      createdAt: new Date().toISOString(),
    }),
  ),
];
