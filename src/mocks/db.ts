import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  BodyPart,
  Enrollment,
  EnrollmentStatus,
  Exercise,
  Member,
  MemberGender,
  Session,
} from '../types';

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

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromToday(offset: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const db = {
  members: [] as Member[],
  enrollments: [] as Enrollment[],
  sessions: [] as Session[],
  appointments: [] as Appointment[],
  bodyParts: [] as BodyPart[],
  exercises: [] as Exercise[],
};

function makeMember(
  name: string,
  gender: MemberGender,
  age: number,
  occupation: string,
  ptExperience: string,
  phone: string,
  memo: string | null,
  createdOffsetDays: number,
): Member {
  const d = new Date();
  d.setDate(d.getDate() + createdOffsetDays);
  return {
    id: uuid(),
    name,
    gender,
    age,
    occupation,
    ptExperience,
    phone,
    memo,
    createdAt: d.toISOString(),
  };
}

function makeEnrollment(
  totalSessions: number,
  startedOffsetDays: number,
  status: EnrollmentStatus,
  usedSessions: number,
): Enrollment {
  const d = new Date();
  d.setDate(d.getDate() + startedOffsetDays);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    id: uuid(),
    totalSessions,
    startedAt: dateStr,
    status,
    createdAt: d.toISOString(),
    usedSessions,
  };
}

function makeAppointment(
  memberId: string | null,
  offsetDays: number,
  hour: number,
  kind: AppointmentKind,
  status: AppointmentStatus,
  note: string | null,
  durationMin = 60,
): Appointment {
  const member = db.members.find((m) => m.id === memberId) ?? null;
  return {
    id: uuid(),
    member,
    startAt: daysFromToday(offsetDays, hour, 0),
    durationMin,
    kind,
    status,
    note,
    createdAt: nowIso(),
  };
}

export function seedDb(): void {
  db.members = [];
  db.enrollments = [];
  db.sessions = [];
  db.appointments = [];
  db.bodyParts = [];
  db.exercises = [];

  const kim = makeMember(
    '김민준',
    'MALE',
    32,
    'IT 개발자',
    '헬스 2년, 최근 6개월 쉼',
    '010-2345-6789',
    '목표: 체중 5kg 감량, 어깨 뭉침 개선',
    -20,
  );
  const lee = makeMember(
    '이서연',
    'FEMALE',
    27,
    '마케터',
    '요가 1년, PT 경험 없음',
    '010-3456-7890',
    '목표: 탄력 있는 몸매, 하체 중심 운동 선호',
    -15,
  );
  const park = makeMember(
    '박지훈',
    'MALE',
    45,
    '자영업(음식점)',
    '운동 경험 전혀 없음',
    '010-4567-8901',
    '허리 디스크 병력 있음. 무리한 동작 주의',
    -10,
  );
  const choi = makeMember(
    '최수아',
    'FEMALE',
    22,
    '대학생',
    '필라테스 3개월',
    '010-5678-9012',
    '대회 준비 중 - 체지방 감량 + 근육 선명도',
    -8,
  );
  const jung = makeMember(
    '정우진',
    'MALE',
    38,
    '회사원(금융)',
    '크로스핏 1년',
    '010-6789-0123',
    '무릎 부상 이력, 하체 중량 조절 필요',
    -6,
  );
  const han = makeMember(
    '한예린',
    'FEMALE',
    34,
    '프리랜서 디자이너',
    '홈트 6개월',
    '010-7890-1234',
    '산후 회복 목적, 복부 집중',
    -4,
  );
  const yoon = makeMember(
    '윤지아',
    'FEMALE',
    29,
    '간호사',
    'PT 문의 · 아직 시작 전',
    '010-8901-2345',
    '야간 근무 때문에 새벽 시간대 선호',
    -2,
  );
  const song = makeMember(
    '송민호',
    'MALE',
    52,
    '교사',
    '등산 오래 하심',
    '010-9012-3456',
    '은퇴 후 건강 관리 목적. 혈압 약 복용 중',
    -1,
  );

  db.members = [kim, lee, park, choi, jung, han, yoon, song];

  const enrollmentSeeds: Array<{
    memberId: string;
    total: number;
    offset: number;
    status: EnrollmentStatus;
    used: number;
  }> = [
    { memberId: kim.id, total: 20, offset: -15, status: 'ACTIVE', used: 8 },
    { memberId: kim.id, total: 10, offset: -5, status: 'ACTIVE', used: 2 },
    { memberId: lee.id, total: 30, offset: -12, status: 'ACTIVE', used: 12 },
    { memberId: park.id, total: 10, offset: -8, status: 'ACTIVE', used: 3 },
    { memberId: jung.id, total: 50, offset: -30, status: 'ACTIVE', used: 18 },
    { memberId: choi.id, total: 10, offset: -60, status: 'CANCELED', used: 2 },
    {
      memberId: song.id,
      total: 20,
      offset: -120,
      status: 'COMPLETED',
      used: 20,
    },
  ];
  db.enrollments = enrollmentSeeds.map((s) => {
    const e = makeEnrollment(s.total, s.offset, s.status, s.used);
    (e as Enrollment & { memberId: string }).memberId = s.memberId;
    return e;
  });
  // yoon(윤지아), han(한예린)은 등록권 없음 → CONSULTATION

  db.appointments = [
    makeAppointment(kim.id, 0, 10, 'SESSION', 'SCHEDULED', '하체 데이'),
    makeAppointment(lee.id, 0, 14, 'SESSION', 'SCHEDULED', '상체 + 코어'),
    makeAppointment(
      park.id,
      1,
      11,
      'CONSULTATION',
      'SCHEDULED',
      '허리 디스크 체크 + 상담',
      45,
    ),
    makeAppointment(
      jung.id,
      1,
      19,
      'SESSION',
      'SCHEDULED',
      '무릎 보호 하체',
    ),
    makeAppointment(
      choi.id,
      2,
      9,
      'SESSION',
      'SCHEDULED',
      '대회 준비 - 유산소 집중',
    ),
    makeAppointment(
      han.id,
      3,
      15,
      'SESSION',
      'SCHEDULED',
      '복부 + 골반 안정화',
    ),
    makeAppointment(kim.id, 3, 18, 'SESSION', 'SCHEDULED', '상체 데이'),
    makeAppointment(lee.id, 5, 13, 'SESSION', 'SCHEDULED', '하체 + 런지'),
    makeAppointment(
      yoon.id,
      2,
      7,
      'CONSULTATION',
      'SCHEDULED',
      '신규 상담',
      30,
    ),
    makeAppointment(park.id, -2, 11, 'SESSION', 'COMPLETED', '첫 PT 세션'),
    makeAppointment(
      song.id,
      -5,
      16,
      'SESSION',
      'COMPLETED',
      '재등록 검토',
    ),
  ];
}

seedDb();
