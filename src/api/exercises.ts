import { api } from '../lib/api';
import type { Exercise } from '../types';

export interface CreateExercisePayload {
  name: string;
  defaultBodyPartId?: string;
  cautionTemplate?: string;
}

export const exercisesApi = {
  list: () => api<Exercise[]>('/exercises'),
  create: (dto: CreateExercisePayload) =>
    api<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: Partial<CreateExercisePayload>) =>
    api<Exercise>(`/exercises/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/exercises/${id}`, { method: 'DELETE' }),
};
