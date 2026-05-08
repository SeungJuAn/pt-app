import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconChartBar,
  IconChevronDown,
  IconChevronUp,
  IconClipboardList,
  IconNotebook,
  IconPencil,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { enrollmentsApi } from '../api/enrollments';
import { membersApi } from '../api/members';
import { sessionsApi } from '../api/sessions';
import { MemberFormModal } from '../components/MemberFormModal';
import type {
  Enrollment,
  EnrollmentStatus,
  UpdateMemberDto,
} from '../types';

const STATUS_META: Record<EnrollmentStatus, { label: string; color: string; gradient: string }> = {
  ACTIVE: { label: '진행 중', color: 'teal', gradient: 'linear-gradient(135deg,#0d9488,#0891b2)' },
  COMPLETED: { label: '완료', color: 'gray', gradient: 'linear-gradient(135deg,#64748b,#94a3b8)' },
  CANCELED: { label: '취소', color: 'red', gradient: 'linear-gradient(135deg,#dc2626,#ef4444)' },
};

const PERF_META: Record<'GOOD' | 'NORMAL' | 'BAD', { label: string; color: string }> = {
  GOOD: { label: '👍 좋음', color: 'teal' },
  NORMAL: { label: '🆗 보통', color: 'gray' },
  BAD: { label: '👎 나쁨', color: 'red' },
};

interface EnrollmentFormValues {
  totalSessions: number;
  startedAt: Date | null;
}

function avatarColor(name: string) {
  const colors = ['teal', 'cyan', 'blue', 'indigo', 'violet', 'grape', 'pink', 'orange'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

function initials(name: string) {
  const t = name.trim();
  if (!t) return '?';
  if (/[가-힣]/.test(t)) return t.length > 2 ? t.slice(-2) : t;
  return t.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function EnrollmentCard({
  enrollment,
  sessions,
  onRecordSession,
  onComplete,
  onCancel,
  onDelete,
}: {
  enrollment: Enrollment;
  sessions: { id: string; date: string; dayNumber: number; performance: string | null; note: string | null; exerciseEntries: { length: number } | unknown[] }[];
  onRecordSession: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [showSessions, { toggle }] = useDisclosure(false);
  const navigate = useNavigate();
  const used = enrollment.usedSessions ?? 0;
  const percent = Math.min(100, (used / enrollment.totalSessions) * 100);
  const meta = STATUS_META[enrollment.status];

  return (
    <Card withBorder radius="xl" padding={0} style={{ overflow: 'hidden' }}>
      {/* 등록권 헤더 */}
      <Box
        style={{
          background: enrollment.status === 'ACTIVE'
            ? 'linear-gradient(135deg,rgba(13,148,136,0.08),rgba(8,145,178,0.06))'
            : 'rgba(248,250,252,0.8)',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          padding: '18px 22px',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Group gap="sm" align="center">
            <Box
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: meta.gradient,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}
            >
              <IconClipboardList size={18} color="white" />
            </Box>
            <Stack gap={2}>
              <Group gap={6}>
                <Badge color={meta.color} variant="filled" size="sm" radius="sm">
                  {meta.label}
                </Badge>
                <Text fw={700} size="sm">{enrollment.totalSessions}회권</Text>
              </Group>
              <Text size="xs" c="dimmed">
                시작일 {dayjs(enrollment.startedAt).format('YYYY.MM.DD')}
              </Text>
            </Stack>
          </Group>

          <Group gap={6}>
            {enrollment.status === 'ACTIVE' && (
              <>
                <Button
                  size="xs"
                  leftSection={<IconNotebook size={12} />}
                  onClick={onRecordSession}
                  radius="xl"
                  variant="gradient"
                  gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
                >
                  세션 기록
                </Button>
                <Button size="xs" variant="light" color="teal" radius="xl" onClick={onComplete}>
                  완료 처리
                </Button>
                <Button size="xs" variant="subtle" color="red" radius="xl" onClick={onCancel}>
                  취소
                </Button>
              </>
            )}
            <ActionIcon variant="subtle" color="red" onClick={onDelete}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* 진행률 */}
      <Box px="xl" pt="md" pb="sm">
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed">진행률</Text>
          <Text size="xs" fw={600} c={meta.color}>
            {used} / {enrollment.totalSessions}회
          </Text>
        </Group>
        <Progress
          value={percent}
          size="md"
          radius="xl"
          color={meta.color}
        />
      </Box>

      {/* 세션 내역 토글 */}
      {sessions.length > 0 && (
        <Box px="xl" pb="lg">
          <Button
            variant="subtle"
            size="xs"
            color="gray"
            leftSection={<IconChartBar size={12} />}
            rightSection={showSessions ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            onClick={toggle}
            fullWidth
            mt="xs"
            radius="xl"
            styles={{ root: { borderTop: '1px solid rgba(226,232,240,0.6)', paddingTop: 8 } }}
          >
            세션 내역 {sessions.length}건 {showSessions ? '접기' : '보기'}
          </Button>
          <Collapse in={showSessions}>
            <Stack gap={4} mt="sm">
              {sessions.map((s) => {
                const perf = s.performance ? PERF_META[s.performance as 'GOOD' | 'NORMAL' | 'BAD'] : null;
                const exCount = Array.isArray(s.exerciseEntries) ? s.exerciseEntries.length : 0;
                return (
                  <Box
                    key={s.id}
                    onClick={() => navigate(`/sessions/${s.id}`)}
                    style={{
                      borderRadius: 12,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      border: '1px solid rgba(226,232,240,0.8)',
                      background: 'rgba(248,250,252,0.6)',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(13,148,136,0.06)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(13,148,136,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(248,250,252,0.6)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(226,232,240,0.8)';
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <Box
                          style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                          }}
                        >
                          <Text size="xs" fw={700} c="white">{s.dayNumber}</Text>
                        </Box>
                        <Stack gap={0}>
                          <Text size="xs" fw={500}>{dayjs(s.date).format('M/D (ddd)')}</Text>
                          <Text size="xs" c="dimmed">{exCount}종 운동</Text>
                        </Stack>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        {perf && (
                          <Badge size="xs" variant="light" color={perf.color} radius="sm">
                            {perf.label}
                          </Badge>
                        )}
                        {s.note && (
                          <Text size="xs" c="dimmed" lineClamp={1} maw={120}>
                            {s.note}
                          </Text>
                        )}
                      </Group>
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          </Collapse>
        </Box>
      )}

      {sessions.length === 0 && enrollment.status !== 'ACTIVE' && (
        <Box px="xl" pb="lg">
          <Text size="xs" c="dimmed" ta="center" pt="xs">기록된 세션이 없습니다.</Text>
        </Box>
      )}
    </Card>
  );
}

export function MemberDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [_expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);

  const memberQuery = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.get(id),
    enabled: !!id,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => enrollmentsApi.listByMember(id),
    enabled: !!id,
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'member', id],
    queryFn: () => sessionsApi.listByMember(id),
    enabled: !!id,
  });

  const form = useForm<EnrollmentFormValues>({
    initialValues: { totalSessions: 20, startedAt: new Date() },
    validate: {
      totalSessions: (v) => (v && v >= 1 && v <= 1000 ? null : '1~1000회 사이로 입력하세요'),
      startedAt: (v) => (v ? null : '시작일을 선택하세요'),
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: EnrollmentFormValues) =>
      enrollmentsApi.create({
        memberId: id,
        totalSessions: values.totalSessions,
        startedAt: values.startedAt ? dayjs(values.startedAt).format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
      notifications.show({ message: '등록권이 추가되었습니다.', color: 'teal' });
      close();
      form.reset();
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof Error ? err.message : '추가 실패',
        color: 'red',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: string; status: EnrollmentStatus }) =>
      enrollmentsApi.update(enrollmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.remove(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
      notifications.show({ message: '삭제되었습니다.', color: 'teal' });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (dto: UpdateMemberDto) => membersApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['members', id] });
      notifications.show({ message: '회원 정보가 수정되었습니다.', color: 'teal' });
      closeEdit();
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof Error ? err.message : '수정 실패',
        color: 'red',
      });
    },
  });

  if (memberQuery.isLoading) return <Loader />;
  if (!memberQuery.data) return <Text>회원을 찾을 수 없습니다.</Text>;

  const member = memberQuery.data;
  const enrollments = enrollmentsQuery.data ?? [];
  const allSessions = sessionsQuery.data ?? [];

  const levelColor = member.level === 'ACTIVE' ? 'teal' : member.level === 'CONSULTATION' ? 'yellow' : 'gray';
  const levelLabel = member.level === 'ACTIVE' ? '활성' : member.level === 'CONSULTATION' ? '상담' : '휴면';

  // 전체 진행 통계
  const totalUsed = enrollments.reduce((sum, e) => sum + (e.usedSessions ?? 0), 0);
  const totalSessions = enrollments.reduce((sum, e) => sum + e.totalSessions, 0);

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/members" size="sm" c="dimmed">
        <Group gap={4}>
          <IconArrowLeft size={14} /> 회원 목록
        </Group>
      </Anchor>

      {/* 회원 프로필 카드 */}
      <Card
        radius="xl"
        padding="xl"
        style={{
          background: 'linear-gradient(135deg,rgba(13,148,136,0.08),rgba(8,145,178,0.05))',
          border: '1px solid rgba(13,148,136,0.15)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          style={{
            position: 'absolute', top: -30, right: -30,
            width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(13,148,136,0.06)',
          }}
        />
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Group gap="md" align="flex-start">
            <Avatar
              size={72}
              radius="xl"
              color={avatarColor(member.name)}
              variant="gradient"
              gradient={{ from: avatarColor(member.name), to: 'cyan', deg: 135 }}
              style={{ border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <Text size="xl" fw={700}>{initials(member.name)}</Text>
            </Avatar>
            <Stack gap={6}>
              <Group gap="xs" align="center">
                <Title order={2}>{member.name}</Title>
                {member.level && (
                  <Badge color={levelColor} variant="filled" size="sm" radius="sm">
                    {levelLabel}
                  </Badge>
                )}
                {member.gender && (
                  <Badge
                    color={member.gender === 'MALE' ? 'blue' : 'pink'}
                    variant="light"
                    size="sm"
                  >
                    {member.gender === 'MALE' ? '남' : '여'}
                    {member.age != null ? ` ${member.age}세` : ''}
                  </Badge>
                )}
              </Group>
              <Group gap="lg" wrap="wrap">
                {member.phone && (
                  <Group gap={4}>
                    <IconPhone size={12} color="#64748b" />
                    <Text size="sm" c="dimmed" ff="monospace">{member.phone}</Text>
                  </Group>
                )}
                {member.occupation && (
                  <Group gap={4}>
                    <IconUser size={12} color="#64748b" />
                    <Text size="sm" c="dimmed">{member.occupation}</Text>
                  </Group>
                )}
              </Group>
              {member.ptExperience && (
                <Text size="sm" c="dimmed">
                  <Text span fw={500} c="dark" size="sm">운동 경험</Text>{' '}{member.ptExperience}
                </Text>
              )}
              {member.memo && (
                <Text size="sm" c="dimmed">
                  <Text span fw={500} c="dark" size="sm">메모</Text>{' '}{member.memo}
                </Text>
              )}
            </Stack>
          </Group>

          <Stack gap="sm" align="flex-end">
            <Button
              size="sm"
              variant="white"
              leftSection={<IconPencil size={14} />}
              onClick={openEdit}
              radius="xl"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            >
              프로필 수정
            </Button>
            {/* 요약 통계 */}
            <Group gap="md">
              <Stack gap={0} align="center">
                <Text fw={700} size="lg" c="teal.7">{allSessions.length}</Text>
                <Text size="xs" c="dimmed">총 세션</Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text fw={700} size="lg" c="teal.7">{enrollments.length}</Text>
                <Text size="xs" c="dimmed">등록권</Text>
              </Stack>
              {totalSessions > 0 && (
                <Stack gap={0} align="center">
                  <Text fw={700} size="lg" c="teal.7">
                    {Math.round((totalUsed / totalSessions) * 100)}%
                  </Text>
                  <Text size="xs" c="dimmed">전체 진행률</Text>
                </Stack>
              )}
            </Group>
          </Stack>
        </Group>
      </Card>

      {/* 등록권 섹션 */}
      <Group justify="space-between" align="center">
        <Group gap={8}>
          <Box
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#0d9488,#0891b2)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <IconClipboardList size={15} color="white" />
          </Box>
          <Title order={4}>등록권</Title>
          {enrollments.length > 0 && (
            <Badge variant="light" color="teal" size="sm">{enrollments.length}개</Badge>
          )}
        </Group>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={open}
          size="sm"
          radius="xl"
          variant="gradient"
          gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
        >
          등록권 추가
        </Button>
      </Group>

      {enrollmentsQuery.isLoading ? (
        <Loader />
      ) : enrollments.length === 0 ? (
        <Card withBorder radius="xl" padding="xl" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
          <IconClipboardList size={36} color="#cbd5e1" stroke={1.5} />
          <Text c="dimmed" size="sm" mt="sm">등록된 수강권이 없습니다.</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={12} />}
            onClick={open}
            mt="sm"
            radius="xl"
          >
            등록권 추가
          </Button>
        </Card>
      ) : (
        <Stack gap="sm">
          {enrollments.map((e: Enrollment) => {
            const enrollmentSessions = allSessions
              .filter((s) => (s as { enrollment?: { id: string } }).enrollment?.id === e.id)
              .sort((a, b) => {
                const da = (a as { dayNumber?: number }).dayNumber ?? 0;
                const db = (b as { dayNumber?: number }).dayNumber ?? 0;
                return db - da;
              });

            return (
              <EnrollmentCard
                key={e.id}
                enrollment={e}
                sessions={enrollmentSessions as Parameters<typeof EnrollmentCard>[0]['sessions']}
                onRecordSession={() => navigate(`/enrollments/${e.id}/sessions/new`)}
                onComplete={() =>
                  updateStatusMutation.mutate({ enrollmentId: e.id, status: 'COMPLETED' })
                }
                onCancel={() =>
                  updateStatusMutation.mutate({ enrollmentId: e.id, status: 'CANCELED' })
                }
                onDelete={() => {
                  if (confirm('이 등록권을 삭제할까요?')) deleteMutation.mutate(e.id);
                }}
              />
            );
          })}
        </Stack>
      )}

      {/* 최근 세션 전체 목록 */}
      {allSessions.length > 0 && (
        <>
          <Group gap={8} mt="md">
            <Box
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                display: 'grid', placeItems: 'center',
              }}
            >
              <IconChartBar size={15} color="white" />
            </Box>
            <Title order={4}>전체 세션 기록</Title>
            <Badge variant="light" color="violet" size="sm">{allSessions.length}건</Badge>
          </Group>
          <Stack gap={4}>
            {allSessions.map((s) => {
              const sTyped = s as {
                id: string;
                date: string;
                dayNumber: number;
                performance: string | null;
                note: string | null;
                exerciseEntries: unknown[];
                enrollment?: { id: string; totalSessions?: number };
              };
              const perf = sTyped.performance ? PERF_META[sTyped.performance as 'GOOD' | 'NORMAL' | 'BAD'] : null;
              const exCount = Array.isArray(sTyped.exerciseEntries) ? sTyped.exerciseEntries.length : 0;
              return (
                <Box
                  key={sTyped.id}
                  onClick={() => navigate(`/sessions/${sTyped.id}`)}
                  style={{
                    borderRadius: 14,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    border: '1px solid rgba(226,232,240,0.8)',
                    background: 'white',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(13,148,136,0.04)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(13,148,136,0.2)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'white';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(226,232,240,0.8)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}
                      >
                        <Text size="sm" fw={700} c="white">{sTyped.dayNumber}</Text>
                      </Box>
                      <Stack gap={1}>
                        <Text size="sm" fw={600}>{dayjs(sTyped.date).format('YYYY.MM.DD (ddd)')}</Text>
                        <Text size="xs" c="dimmed">{exCount}종 운동</Text>
                      </Stack>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      {perf && (
                        <Badge size="sm" variant="light" color={perf.color} radius="sm">
                          {perf.label}
                        </Badge>
                      )}
                      {sTyped.note && (
                        <Text size="xs" c="dimmed" lineClamp={1} maw={160} visibleFrom="sm">
                          {sTyped.note}
                        </Text>
                      )}
                    </Group>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        </>
      )}

      {/* 등록권 추가 모달 */}
      <Modal opened={opened} onClose={close} title="등록권 추가" centered radius="xl" padding="xl">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack gap="md">
            <NumberInput
              label="총 회차"
              min={1}
              max={1000}
              required
              radius="lg"
              size="sm"
              {...form.getInputProps('totalSessions')}
            />
            <DatePickerInput
              label="시작일"
              valueFormat="YYYY-MM-DD"
              required
              radius="lg"
              size="sm"
              {...form.getInputProps('startedAt')}
            />
            <Group justify="flex-end" mt="xs">
              <Button variant="subtle" onClick={close} radius="xl">취소</Button>
              <Button
                type="submit"
                loading={createMutation.isPending}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
                px="xl"
              >
                저장
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <MemberFormModal
        opened={editOpened}
        onClose={closeEdit}
        mode="edit"
        initial={member}
        onSubmit={(dto) => updateMemberMutation.mutate(dto)}
        isSubmitting={updateMemberMutation.isPending}
      />
    </Stack>
  );
}
