import { api } from '../lib/api';
import type {
  CreateMemberDto,
  ListMembersParams,
  Member,
  PaginatedMembers,
  UpdateMemberDto,
} from '../types';

function buildQuery(params: ListMembersParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize));
  if (params.level) sp.set('level', params.level);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const membersApi = {
  list: (params: ListMembersParams = {}) =>
    api<PaginatedMembers>(`/members${buildQuery(params)}`),
  listAll: () =>
    api<PaginatedMembers>('/members?pageSize=500').then((r) => r.items),
  get: (id: string) => api<Member>(`/members/${id}`),
  create: (dto: CreateMemberDto) =>
    api<Member>('/members', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateMemberDto) =>
    api<Member>(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  remove: (id: string) =>
    api<void>(`/members/${id}`, { method: 'DELETE' }),
};
