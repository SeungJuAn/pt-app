import { api } from '../lib/api';
import type {
  CreateEnrollmentDto,
  Enrollment,
  UpdateEnrollmentDto,
} from '../types';

export const enrollmentsApi = {
  listByMember: (memberId: string) =>
    api<Enrollment[]>(`/enrollments?memberId=${encodeURIComponent(memberId)}`),
  get: (id: string) => api<Enrollment>(`/enrollments/${id}`),
  create: (dto: CreateEnrollmentDto) =>
    api<Enrollment>('/enrollments', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateEnrollmentDto) =>
    api<Enrollment>(`/enrollments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/enrollments/${id}`, { method: 'DELETE' }),
};
