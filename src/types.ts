export interface Trainer {
  id: string;
  loginId: string;
  name: string;
  email: string;
  createdAt: string;
}

export type MemberGender = 'MALE' | 'FEMALE';
export type MemberLevel = 'CONSULTATION' | 'ACTIVE' | 'DORMANT';

export interface Member {
  id: string;
  name: string;
  gender: MemberGender | null;
  age: number | null;
  occupation: string | null;
  ptExperience: string | null;
  phone: string | null;
  memo: string | null;
  createdAt: string;
  level?: MemberLevel;
  enrollmentCount?: number;
  activeEnrollmentCount?: number;
}

export interface CreateMemberDto {
  name: string;
  gender?: MemberGender;
  age?: number;
  occupation?: string;
  ptExperience?: string;
  phone?: string;
  memo?: string;
}

export interface PaginatedMembers {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListMembersParams {
  q?: string;
  page?: number;
  pageSize?: number;
  level?: MemberLevel;
}

export type UpdateMemberDto = Partial<CreateMemberDto>;

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELED';

export interface Enrollment {
  id: string;
  totalSessions: number;
  startedAt: string;
  status: EnrollmentStatus;
  createdAt: string;
  usedSessions?: number;
  member?: Member;
}

export interface CreateEnrollmentDto {
  memberId: string;
  totalSessions: number;
  startedAt?: string;
}

export interface UpdateEnrollmentDto {
  totalSessions?: number;
  startedAt?: string;
  status?: EnrollmentStatus;
}

export interface BodyPart {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Exercise {
  id: string;
  name: string;
  cautionTemplate: string | null;
  defaultBodyPart: BodyPart | null;
  createdAt?: string;
}

export interface DailyCheck {
  sleep: boolean;
  diet: boolean;
  alcoholFree: boolean;
  defecation: boolean;
  hydration: boolean;
  condition: string | null;
  cardioMinutes: number;
  steps: number;
}

export interface BodyMetric {
  weightKg: string;
  skeletalMuscleKg: string;
  bodyFatKg: string;
  bodyFatPercent: string;
}

export interface SetRecord {
  id: string;
  setNumber: number;
  weightKg: string;
  reps: number;
}

export interface ExerciseEntry {
  id: string;
  order: number;
  exercise: Exercise;
  bodyPart: BodyPart | null;
  sets: SetRecord[];
}

export interface Session {
  id: string;
  dayNumber: number;
  date: string;
  note: string | null;
  createdAt: string;
  dailyCheck: DailyCheck;
  bodyMetric: BodyMetric;
  exerciseEntries: ExerciseEntry[];
  enrollment?: Enrollment & { member?: Member };
}

export interface CreateSetDto {
  setNumber: number;
  weightKg?: string;
  reps: number;
}

export interface CreateExerciseEntryDto {
  exerciseId: string;
  bodyPartId?: string;
  order: number;
  sets: CreateSetDto[];
}

export interface CreateSessionDto {
  enrollmentId: string;
  date: string;
  dayNumber?: number;
  note?: string;
  dailyCheck?: Partial<DailyCheck>;
  bodyMetric?: Partial<BodyMetric>;
  exerciseEntries: CreateExerciseEntryDto[];
}

export type AppointmentKind = 'CONSULTATION' | 'SESSION';
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  member: Member | null;
  startAt: string;
  durationMin: number;
  kind: AppointmentKind;
  status: AppointmentStatus;
  note: string | null;
  createdAt: string;
}

export interface CreateAppointmentDto {
  memberId?: string;
  startAt: string;
  durationMin?: number;
  kind?: AppointmentKind;
  note?: string;
}

export interface UpdateAppointmentDto {
  memberId?: string;
  startAt?: string;
  durationMin?: number;
  kind?: AppointmentKind;
  status?: AppointmentStatus;
  note?: string;
}
