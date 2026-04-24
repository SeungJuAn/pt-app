import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  BodyPart,
  Enrollment,
  EnrollmentStatus,
  Exercise,
  ExerciseEntry,
  Member,
  MemberGender,
  Session,
  SetRecord,
} from '../types';

type SessionWithMeta = Session & { memberId: string; enrollmentId: string };
type EnrollmentWithMember = Enrollment & { memberId: string };

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
  sessions: [] as SessionWithMeta[],
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

function makeBodyPart(name: string): BodyPart {
  return { id: uuid(), name, createdAt: new Date().toISOString() };
}

function makeExercise(
  name: string,
  bodyPart: BodyPart | null,
  cautionTemplate: string | null = null,
): Exercise {
  return {
    id: uuid(),
    name,
    cautionTemplate,
    defaultBodyPart: bodyPart,
    createdAt: new Date().toISOString(),
  };
}

function makeSet(
  setNumber: number,
  weightKg: string,
  reps: number,
): SetRecord {
  return { id: uuid(), setNumber, weightKg, reps };
}

function makeExerciseEntry(
  order: number,
  exercise: Exercise,
  sets: SetRecord[],
): ExerciseEntry {
  return {
    id: uuid(),
    order,
    exercise,
    bodyPart: exercise.defaultBodyPart,
    sets,
  };
}

function makeSession(opts: {
  memberId: string;
  enrollmentId: string;
  dayNumber: number;
  offsetDays: number;
  note: string;
  weightKg: string;
  muscleKg: string;
  fatPercent: string;
  condition: string;
  entries: ExerciseEntry[];
}): SessionWithMeta {
  const d = new Date();
  d.setDate(d.getDate() + opts.offsetDays);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    id: uuid(),
    memberId: opts.memberId,
    enrollmentId: opts.enrollmentId,
    dayNumber: opts.dayNumber,
    date: dateStr,
    note: opts.note,
    createdAt: d.toISOString(),
    dailyCheck: {
      sleep: true,
      diet: Math.random() > 0.3,
      alcoholFree: Math.random() > 0.4,
      defecation: Math.random() > 0.3,
      hydration: Math.random() > 0.2,
      condition: opts.condition,
      cardioMinutes: Math.random() > 0.5 ? 20 : 0,
      steps: Math.floor(4000 + Math.random() * 6000),
    },
    bodyMetric: {
      weightKg: opts.weightKg,
      skeletalMuscleKg: opts.muscleKg,
      bodyFatKg: (
        Number(opts.weightKg) * (Number(opts.fatPercent) / 100)
      ).toFixed(2),
      bodyFatPercent: opts.fatPercent,
    },
    exerciseEntries: opts.entries,
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
    (e as EnrollmentWithMember).memberId = s.memberId;
    return e;
  });
  // yoon(윤지아), han(한예린)은 등록권 없음 → CONSULTATION

  // ===== Body parts / Exercises =====
  const bpChest = makeBodyPart('가슴');
  const bpBack = makeBodyPart('등');
  const bpLeg = makeBodyPart('하체');
  const bpShoulder = makeBodyPart('어깨');
  const bpArm = makeBodyPart('팔');
  const bpCore = makeBodyPart('코어');
  db.bodyParts = [bpChest, bpBack, bpLeg, bpShoulder, bpArm, bpCore];

  const exBench = makeExercise('벤치프레스', bpChest, '어깨 너무 내리지 말 것');
  const exIncline = makeExercise('인클라인 덤벨프레스', bpChest);
  const exLatPull = makeExercise('랫풀다운', bpBack);
  const exRow = makeExercise('시티드 로우', bpBack);
  const exSquat = makeExercise('바벨 스쿼트', bpLeg, '무릎 모임 주의');
  const exDeadlift = makeExercise('루마니안 데드리프트', bpLeg);
  const exLunge = makeExercise('덤벨 런지', bpLeg);
  const exOHP = makeExercise('오버헤드 프레스', bpShoulder);
  const exLatRaise = makeExercise('사이드 레터럴 레이즈', bpShoulder);
  const exCurl = makeExercise('덤벨 컬', bpArm);
  const exPlank = makeExercise('플랭크', bpCore);
  db.exercises = [
    exBench,
    exIncline,
    exLatPull,
    exRow,
    exSquat,
    exDeadlift,
    exLunge,
    exOHP,
    exLatRaise,
    exCurl,
    exPlank,
  ];

  // ===== Sessions (과거 기록) =====
  const kimEnrollment1Id = (db.enrollments[0] as EnrollmentWithMember).id; // kim 20회권
  const leeEnrollmentId = (db.enrollments[2] as EnrollmentWithMember).id; // lee 30회권
  const parkEnrollmentId = (db.enrollments[3] as EnrollmentWithMember).id; // park 10회권
  const jungEnrollmentId = (db.enrollments[4] as EnrollmentWithMember).id; // jung 50회권

  db.sessions = [
    // 김민준 (8회 기록)
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 1,
      offsetDays: -14,
      note: '첫 세션. 전반적인 체력 측정 후 기본 폼 교정 위주로 진행.',
      weightKg: '78.5',
      muscleKg: '34.2',
      fatPercent: '22.5',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exBench, [
          makeSet(1, '40', 12),
          makeSet(2, '50', 10),
          makeSet(3, '50', 8),
        ]),
        makeExerciseEntry(2, exLatPull, [
          makeSet(1, '45', 12),
          makeSet(2, '50', 10),
        ]),
        makeExerciseEntry(3, exPlank, [makeSet(1, '0', 60)]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 2,
      offsetDays: -11,
      note: '벤치 중량 소폭 상승. 폼 안정화됨.',
      weightKg: '78.2',
      muscleKg: '34.3',
      fatPercent: '22.3',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exBench, [
          makeSet(1, '50', 10),
          makeSet(2, '55', 8),
          makeSet(3, '55', 8),
        ]),
        makeExerciseEntry(2, exIncline, [
          makeSet(1, '15', 12),
          makeSet(2, '17.5', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 3,
      offsetDays: -9,
      note: '하체 데이. 스쿼트 폼 재정립.',
      weightKg: '78.0',
      muscleKg: '34.5',
      fatPercent: '22.0',
      condition: '보통',
      entries: [
        makeExerciseEntry(1, exSquat, [
          makeSet(1, '60', 10),
          makeSet(2, '70', 8),
          makeSet(3, '70', 8),
        ]),
        makeExerciseEntry(2, exLunge, [
          makeSet(1, '10', 12),
          makeSet(2, '12.5', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 4,
      offsetDays: -7,
      note: '어깨 데이. 레터럴 레이즈 부담 없이 진행.',
      weightKg: '77.8',
      muscleKg: '34.6',
      fatPercent: '21.8',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exOHP, [
          makeSet(1, '30', 10),
          makeSet(2, '35', 8),
        ]),
        makeExerciseEntry(2, exLatRaise, [
          makeSet(1, '6', 15),
          makeSet(2, '7.5', 12),
          makeSet(3, '7.5', 12),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 5,
      offsetDays: -5,
      note: '등 데이. 자세 훨씬 좋아짐.',
      weightKg: '77.5',
      muscleKg: '34.8',
      fatPercent: '21.5',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exLatPull, [
          makeSet(1, '55', 10),
          makeSet(2, '60', 8),
          makeSet(3, '60', 8),
        ]),
        makeExerciseEntry(2, exRow, [
          makeSet(1, '40', 12),
          makeSet(2, '45', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 6,
      offsetDays: -4,
      note: '가슴 + 이두. 벤치 PR 경신.',
      weightKg: '77.3',
      muscleKg: '35.0',
      fatPercent: '21.2',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exBench, [
          makeSet(1, '55', 10),
          makeSet(2, '62.5', 6),
          makeSet(3, '62.5', 6),
        ]),
        makeExerciseEntry(2, exCurl, [
          makeSet(1, '10', 12),
          makeSet(2, '12', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 7,
      offsetDays: -2,
      note: '하체 고중량 세션. 데드리프트 처음 시도.',
      weightKg: '77.2',
      muscleKg: '35.1',
      fatPercent: '21.0',
      condition: '피로함',
      entries: [
        makeExerciseEntry(1, exSquat, [
          makeSet(1, '70', 8),
          makeSet(2, '80', 6),
          makeSet(3, '80', 6),
        ]),
        makeExerciseEntry(2, exDeadlift, [
          makeSet(1, '50', 10),
          makeSet(2, '60', 8),
        ]),
      ],
    }),
    makeSession({
      memberId: kim.id,
      enrollmentId: kimEnrollment1Id,
      dayNumber: 8,
      offsetDays: -1,
      note: '가벼운 유산소 + 코어.',
      weightKg: '77.0',
      muscleKg: '35.1',
      fatPercent: '20.9',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exPlank, [
          makeSet(1, '0', 75),
          makeSet(2, '0', 75),
          makeSet(3, '0', 60),
        ]),
      ],
    }),
    // 이서연 (12회 중 최근 5개만)
    makeSession({
      memberId: lee.id,
      enrollmentId: leeEnrollmentId,
      dayNumber: 8,
      offsetDays: -8,
      note: '하체 + 코어. 스쿼트 깊이 개선 중.',
      weightKg: '54.5',
      muscleKg: '22.1',
      fatPercent: '26.5',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exSquat, [
          makeSet(1, '30', 12),
          makeSet(2, '35', 10),
          makeSet(3, '35', 10),
        ]),
        makeExerciseEntry(2, exLunge, [
          makeSet(1, '5', 12),
          makeSet(2, '7.5', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: lee.id,
      enrollmentId: leeEnrollmentId,
      dayNumber: 9,
      offsetDays: -6,
      note: '상체. 랫풀다운 무게 상승.',
      weightKg: '54.4',
      muscleKg: '22.2',
      fatPercent: '26.3',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exLatPull, [
          makeSet(1, '25', 12),
          makeSet(2, '30', 10),
        ]),
        makeExerciseEntry(2, exRow, [
          makeSet(1, '20', 12),
          makeSet(2, '22.5', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: lee.id,
      enrollmentId: leeEnrollmentId,
      dayNumber: 10,
      offsetDays: -4,
      note: '힙 타겟 세션.',
      weightKg: '54.2',
      muscleKg: '22.3',
      fatPercent: '26.0',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exDeadlift, [
          makeSet(1, '30', 10),
          makeSet(2, '35', 10),
          makeSet(3, '40', 8),
        ]),
        makeExerciseEntry(2, exLunge, [
          makeSet(1, '7.5', 12),
          makeSet(2, '10', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: lee.id,
      enrollmentId: leeEnrollmentId,
      dayNumber: 11,
      offsetDays: -3,
      note: '코어 집중 + 유산소 25분.',
      weightKg: '54.0',
      muscleKg: '22.4',
      fatPercent: '25.8',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exPlank, [
          makeSet(1, '0', 60),
          makeSet(2, '0', 60),
        ]),
      ],
    }),
    makeSession({
      memberId: lee.id,
      enrollmentId: leeEnrollmentId,
      dayNumber: 12,
      offsetDays: -1,
      note: '전신 라이트 세션.',
      weightKg: '53.8',
      muscleKg: '22.5',
      fatPercent: '25.5',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exSquat, [
          makeSet(1, '35', 10),
          makeSet(2, '40', 8),
        ]),
        makeExerciseEntry(2, exLatPull, [
          makeSet(1, '30', 10),
          makeSet(2, '32.5', 8),
        ]),
      ],
    }),
    // 박지훈 (3회 기록, 허리 디스크 배려)
    makeSession({
      memberId: park.id,
      enrollmentId: parkEnrollmentId,
      dayNumber: 1,
      offsetDays: -6,
      note: '첫 세션. 허리 보호하며 가볍게.',
      weightKg: '82.5',
      muscleKg: '33.1',
      fatPercent: '28.0',
      condition: '조심스러움',
      entries: [
        makeExerciseEntry(1, exPlank, [
          makeSet(1, '0', 30),
          makeSet(2, '0', 30),
        ]),
        makeExerciseEntry(2, exIncline, [
          makeSet(1, '8', 15),
          makeSet(2, '10', 12),
        ]),
      ],
    }),
    makeSession({
      memberId: park.id,
      enrollmentId: parkEnrollmentId,
      dayNumber: 2,
      offsetDays: -4,
      note: '코어 안정화 + 가벼운 상체.',
      weightKg: '82.3',
      muscleKg: '33.2',
      fatPercent: '27.8',
      condition: '보통',
      entries: [
        makeExerciseEntry(1, exPlank, [
          makeSet(1, '0', 45),
          makeSet(2, '0', 45),
        ]),
        makeExerciseEntry(2, exRow, [
          makeSet(1, '25', 12),
          makeSet(2, '30', 10),
        ]),
      ],
    }),
    makeSession({
      memberId: park.id,
      enrollmentId: parkEnrollmentId,
      dayNumber: 3,
      offsetDays: -2,
      note: '허리 컨디션 양호. 하체 도입.',
      weightKg: '82.0',
      muscleKg: '33.4',
      fatPercent: '27.5',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exLunge, [
          makeSet(1, '0', 12),
          makeSet(2, '5', 10),
        ]),
        makeExerciseEntry(2, exPlank, [makeSet(1, '0', 60)]),
      ],
    }),
    // 정우진 (18회 중 최근 3개만)
    makeSession({
      memberId: jung.id,
      enrollmentId: jungEnrollmentId,
      dayNumber: 16,
      offsetDays: -6,
      note: '하체 중량 진행. 무릎 상태 양호.',
      weightKg: '75.0',
      muscleKg: '36.5',
      fatPercent: '18.0',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exSquat, [
          makeSet(1, '90', 6),
          makeSet(2, '100', 4),
          makeSet(3, '100', 4),
        ]),
        makeExerciseEntry(2, exDeadlift, [
          makeSet(1, '80', 8),
          makeSet(2, '90', 6),
        ]),
      ],
    }),
    makeSession({
      memberId: jung.id,
      enrollmentId: jungEnrollmentId,
      dayNumber: 17,
      offsetDays: -3,
      note: '상체 종일.',
      weightKg: '74.8',
      muscleKg: '36.6',
      fatPercent: '17.8',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exBench, [
          makeSet(1, '80', 6),
          makeSet(2, '85', 5),
          makeSet(3, '85', 5),
        ]),
        makeExerciseEntry(2, exOHP, [
          makeSet(1, '45', 8),
          makeSet(2, '50', 6),
        ]),
      ],
    }),
    makeSession({
      memberId: jung.id,
      enrollmentId: jungEnrollmentId,
      dayNumber: 18,
      offsetDays: -1,
      note: '풀 바디 라이트 데이.',
      weightKg: '74.5',
      muscleKg: '36.7',
      fatPercent: '17.6',
      condition: '좋음',
      entries: [
        makeExerciseEntry(1, exLatPull, [
          makeSet(1, '60', 10),
          makeSet(2, '65', 8),
        ]),
        makeExerciseEntry(2, exCurl, [
          makeSet(1, '15', 10),
          makeSet(2, '17.5', 8),
        ]),
      ],
    }),
  ];

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
