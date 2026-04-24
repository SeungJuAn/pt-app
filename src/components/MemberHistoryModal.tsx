import {
  Anchor,
  Badge,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Progress,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router';
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

interface Props {
  memberId: string | null;
  opened: boolean;
  onClose: () => void;
}

export function MemberHistoryModal({ memberId, opened, onClose }: Props) {
  const memberQuery = useQuery({
    queryKey: ['members', memberId],
    queryFn: () => membersApi.get(memberId as string),
    enabled: opened && !!memberId,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', memberId],
    queryFn: () => enrollmentsApi.listByMember(memberId as string),
    enabled: opened && !!memberId,
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions', 'member', memberId],
    queryFn: () => sessionsApi.listByMember(memberId as string),
    enabled: opened && !!memberId,
  });

  const member = memberQuery.data;
  const enrollments = enrollmentsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const totalSessionsUsed = enrollments.reduce(
    (sum, e) => sum + (e.usedSessions ?? 0),
    0,
  );
  const totalSessionsAvail = enrollments.reduce(
    (sum, e) => sum + e.totalSessions,
    0,
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={member ? `${member.name} · 진행 현황` : '진행 현황'}
      size="lg"
      centered
    >
      {memberQuery.isLoading || !member ? (
        <Loader />
      ) : (
        <Stack>
          <Card withBorder padding="sm">
            <Group gap="xs" align="baseline" wrap="wrap">
              {member.gender && (
                <Badge
                  variant="light"
                  color={member.gender === 'MALE' ? 'blue' : 'pink'}
                >
                  {member.gender === 'MALE' ? '남' : '여'}
                </Badge>
              )}
              {member.age != null && (
                <Text size="sm">{member.age}세</Text>
              )}
              {member.occupation && (
                <Text size="sm" c="dimmed">
                  · {member.occupation}
                </Text>
              )}
              {member.phone && (
                <Text size="sm" c="dimmed">
                  · {member.phone}
                </Text>
              )}
            </Group>
            {member.ptExperience && (
              <Text size="xs" c="dimmed" mt={4}>
                운동 경험: {member.ptExperience}
              </Text>
            )}
            {member.memo && (
              <Text size="xs" c="dimmed" mt={2}>
                메모: {member.memo}
              </Text>
            )}
          </Card>

          <Group justify="space-between">
            <Text fw={600}>
              누적 진행 {totalSessionsUsed} / {totalSessionsAvail}회
            </Text>
            <Anchor component={Link} to={`/members/${member.id}`} size="sm">
              상세 페이지로 →
            </Anchor>
          </Group>

          <Divider label="등록권" labelPosition="left" />
          {enrollmentsQuery.isLoading ? (
            <Loader size="sm" />
          ) : enrollments.length === 0 ? (
            <Text c="dimmed" size="sm">
              등록권이 없습니다.
            </Text>
          ) : (
            <Stack gap="xs">
              {enrollments.map((e: Enrollment) => {
                const used = e.usedSessions ?? 0;
                const percent = Math.min(100, (used / e.totalSessions) * 100);
                const meta = STATUS_META[e.status];
                return (
                  <Card key={e.id} withBorder padding="sm">
                    <Group justify="space-between" mb={6}>
                      <Group gap="xs">
                        <Badge color={meta.color} variant="light" size="sm">
                          {meta.label}
                        </Badge>
                        <Text size="sm" fw={500}>
                          {e.totalSessions}회권
                        </Text>
                        <Text size="xs" c="dimmed">
                          시작 {dayjs(e.startedAt).format('YYYY-MM-DD')}
                        </Text>
                      </Group>
                      <Text size="sm" fw={500}>
                        {used}/{e.totalSessions}
                      </Text>
                    </Group>
                    <Progress value={percent} size="sm" color={meta.color} />
                  </Card>
                );
              })}
            </Stack>
          )}

          <Divider label="최근 세션" labelPosition="left" />
          {sessionsQuery.isLoading ? (
            <Loader size="sm" />
          ) : sessions.length === 0 ? (
            <Text c="dimmed" size="sm">
              기록된 세션이 없습니다.
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>날짜</Table.Th>
                  <Table.Th w={70}>Day</Table.Th>
                  <Table.Th w={80}>운동</Table.Th>
                  <Table.Th>한줄평</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sessions.slice(0, 10).map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      {dayjs(s.date).format('YYYY-MM-DD')}
                    </Table.Td>
                    <Table.Td>{s.dayNumber}</Table.Td>
                    <Table.Td>{s.exerciseEntries?.length ?? 0}종</Table.Td>
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
          {sessions.length > 10 && (
            <Text size="xs" c="dimmed" ta="right">
              최근 10건 표시 · 전체 {sessions.length}건
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}
