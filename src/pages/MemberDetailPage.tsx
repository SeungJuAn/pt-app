import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconNotebook,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link, useParams } from 'react-router';
import { enrollmentsApi } from '../api/enrollments';
import { membersApi } from '../api/members';
import { sessionsApi } from '../api/sessions';
import type { Enrollment, EnrollmentStatus } from '../types';

const STATUS_META: Record<
  EnrollmentStatus,
  { label: string; color: string }
> = {
  ACTIVE: { label: '진행 중', color: 'teal' },
  COMPLETED: { label: '완료', color: 'gray' },
  CANCELED: { label: '취소', color: 'red' },
};

interface EnrollmentFormValues {
  totalSessions: number;
  startedAt: Date | null;
}

export function MemberDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);

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
    initialValues: {
      totalSessions: 20,
      startedAt: new Date(),
    },
    validate: {
      totalSessions: (v) =>
        v && v >= 1 && v <= 1000 ? null : '1~1000회 사이로 입력하세요',
      startedAt: (v) => (v ? null : '시작일을 선택하세요'),
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: EnrollmentFormValues) =>
      enrollmentsApi.create({
        memberId: id,
        totalSessions: values.totalSessions,
        startedAt: values.startedAt
          ? dayjs(values.startedAt).format('YYYY-MM-DD')
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
      notifications.show({
        message: '등록권이 추가되었습니다.',
        color: 'teal',
      });
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
    mutationFn: ({
      enrollmentId,
      status,
    }: {
      enrollmentId: string;
      status: EnrollmentStatus;
    }) => enrollmentsApi.update(enrollmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      enrollmentsApi.remove(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', id] });
      notifications.show({ message: '삭제되었습니다.', color: 'teal' });
    },
  });

  if (memberQuery.isLoading) return <Loader />;
  if (!memberQuery.data) return <Text>회원을 찾을 수 없습니다.</Text>;

  const member = memberQuery.data;
  const enrollments = enrollmentsQuery.data ?? [];

  return (
    <Stack>
      <Anchor component={Link} to="/members" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={14} /> 회원 목록
        </Group>
      </Anchor>

      <Card withBorder padding="md">
        <Stack gap={6}>
          <Group justify="space-between" align="flex-start">
            <Group gap="xs" align="baseline">
              <Title order={2}>{member.name}</Title>
              {member.level && (
                <Badge
                  variant="light"
                  color={
                    member.level === 'ACTIVE'
                      ? 'teal'
                      : member.level === 'CONSULTATION'
                        ? 'yellow'
                        : 'gray'
                  }
                >
                  {member.level === 'ACTIVE'
                    ? '활성'
                    : member.level === 'CONSULTATION'
                      ? '상담'
                      : '휴면'}
                </Badge>
              )}
              {member.gender && (
                <Badge
                  variant="light"
                  color={member.gender === 'MALE' ? 'blue' : 'pink'}
                >
                  {member.gender === 'MALE' ? '남' : '여'}
                </Badge>
              )}
              {member.age != null && (
                <Text c="dimmed">{member.age}세</Text>
              )}
            </Group>
          </Group>
          <Group gap="lg" c="dimmed" style={{ fontSize: 14 }}>
            <Text size="sm">
              <Text span fw={500} c="dark">
                연락처
              </Text>{' '}
              {member.phone ?? '-'}
            </Text>
            <Text size="sm">
              <Text span fw={500} c="dark">
                직장
              </Text>{' '}
              {member.occupation ?? '-'}
            </Text>
          </Group>
          {member.ptExperience && (
            <Text size="sm">
              <Text span fw={500}>
                운동 경험
              </Text>{' '}
              {member.ptExperience}
            </Text>
          )}
          {member.memo && (
            <Text size="sm">
              <Text span fw={500}>
                기타
              </Text>{' '}
              {member.memo}
            </Text>
          )}
        </Stack>
      </Card>

      <Group justify="space-between" mt="md">
        <Title order={4}>등록권</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={open}
          size="sm"
        >
          등록권 추가
        </Button>
      </Group>

      {enrollmentsQuery.isLoading ? (
        <Loader />
      ) : enrollments.length === 0 ? (
        <Text c="dimmed" size="sm">
          등록권이 없습니다.
        </Text>
      ) : (
        <Stack>
          {enrollments.map((e: Enrollment) => {
            const used = e.usedSessions ?? 0;
            const percent = Math.min(100, (used / e.totalSessions) * 100);
            const meta = STATUS_META[e.status];
            return (
              <Card key={e.id} withBorder padding="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Badge color={meta.color} variant="light">
                      {meta.label}
                    </Badge>
                    <Text fw={500}>{e.totalSessions}회권</Text>
                  </Group>
                  <Group gap={4}>
                    {e.status === 'ACTIVE' && (
                      <>
                        <Button
                          component={Link}
                          to={`/enrollments/${e.id}/sessions/new`}
                          size="xs"
                          leftSection={<IconNotebook size={14} />}
                        >
                          세션 기록
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              enrollmentId: e.id,
                              status: 'COMPLETED',
                            })
                          }
                        >
                          완료 처리
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              enrollmentId: e.id,
                              status: 'CANCELED',
                            })
                          }
                        >
                          취소
                        </Button>
                      </>
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        if (confirm('이 등록권을 삭제할까요?')) {
                          deleteMutation.mutate(e.id);
                        }
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Text size="sm" c="dimmed" mb={6}>
                  시작일 {dayjs(e.startedAt).format('YYYY-MM-DD')} · 진행{' '}
                  {used}/{e.totalSessions}회
                </Text>
                <Progress value={percent} size="sm" color={meta.color} />
              </Card>
            );
          })}
        </Stack>
      )}

      <Title order={4} mt="xl">
        세션 히스토리
      </Title>
      {sessionsQuery.isLoading ? (
        <Loader />
      ) : (sessionsQuery.data?.length ?? 0) === 0 ? (
        <Text c="dimmed" size="sm">
          기록된 세션이 없습니다.
        </Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>날짜</Table.Th>
              <Table.Th>Day</Table.Th>
              <Table.Th>운동 수</Table.Th>
              <Table.Th>한줄평</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessionsQuery.data?.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>{dayjs(s.date).format('YYYY-MM-DD')}</Table.Td>
                <Table.Td>{s.dayNumber}</Table.Td>
                <Table.Td>{s.exerciseEntries?.length ?? 0}</Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={1}>
                    {s.note ?? '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title="등록권 추가" centered>
        <form
          onSubmit={form.onSubmit((values) => createMutation.mutate(values))}
        >
          <Stack>
            <NumberInput
              label="총 회차"
              min={1}
              max={1000}
              required
              {...form.getInputProps('totalSessions')}
            />
            <DatePickerInput
              label="시작일"
              valueFormat="YYYY-MM-DD"
              required
              {...form.getInputProps('startedAt')}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={close}>
                취소
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                저장
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
