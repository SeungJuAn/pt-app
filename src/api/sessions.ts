import { api } from '../lib/api';
import type { CreateSessionDto, Session } from '../types';

export const sessionsApi = {
  listByEnrollment: (enrollmentId: string) =>
    api<Session[]>(
      `/sessions?enrollmentId=${encodeURIComponent(enrollmentId)}`,
    ),
  listByMember: (memberId: string) =>
    api<Session[]>(`/sessions?memberId=${encodeURIComponent(memberId)}`),
  get: (id: string) => api<Session>(`/sessions/${id}`),
  create: (dto: CreateSessionDto) =>
    api<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/sessions/${id}`, { method: 'DELETE' }),
};
