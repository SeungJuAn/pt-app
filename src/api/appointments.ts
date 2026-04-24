import { api } from '../lib/api';
import type {
  Appointment,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '../types';

export const appointmentsApi = {
  listRange: (from: string, to: string) =>
    api<Appointment[]>(
      `/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
  get: (id: string) => api<Appointment>(`/appointments/${id}`),
  create: (dto: CreateAppointmentDto) =>
    api<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateAppointmentDto) =>
    api<Appointment>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/appointments/${id}`, { method: 'DELETE' }),
};
