import { api } from '../lib/api';
import type { BodyPart } from '../types';

export const bodyPartsApi = {
  list: () => api<BodyPart[]>('/body-parts'),
  create: (dto: { name: string }) =>
    api<BodyPart>('/body-parts', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: { name: string }) =>
    api<BodyPart>(`/body-parts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/body-parts/${id}`, { method: 'DELETE' }),
};
