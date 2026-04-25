import {
  Anchor,
  Badge,
  Card,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Link, useParams } from 'react-router';
import { sessionsApi } from '../api/sessions';
import { estimateOneRM, totalVolume } from '../lib/oneRm';
import type { SessionPerformance } from '../types';

const PERF_META: Record<
  SessionPerformance,
  { label: string; color: string; emoji: string }
> = {
  GOOD: { label: '좋음', color: 'teal', emoji: '👍' },
  NORMAL: { label: '보통', color: 'gray', emoji: '🆗' },
  BAD: { label: '나쁨', color: 'red', emoji: '👎' },
};

const CHECK_LABEL: Record<string, string> = {
  sleep: '숙면',
  diet: '식단',
  alcoholFree: '금주',
  defecation: '배변',
  hydration: '수분',
};

export function SessionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sessionQuery = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id),
    enabled: !!id,
  });

  if (sessionQuery.isLoading) return <Loader />;
  if (!sessionQuery.data)
    return <Text>세션을 찾을 수 없습니다.</Text>;

  const s = sessionQuery.data;
  const member = s.enrollment?.member;
  const perfMeta = s.performance ? PERF_META[s.performance] : null;

  const checks = s.dailyCheck;
  const checkItems: Array<[string, boolean]> = [
    ['sleep', checks.sleep],
    ['diet', checks.diet],
    ['alcoholFree', checks.alcoholFree],
    ['defecation', checks.defecation],
    ['hydration', checks.hydration],
  ];

  return (
    <Stack>
      <Anchor
        component={Link}
        to={member ? `/members/${member.id}` : '/members'}
        size="sm"
      >
        <Group gap={4}>
          <IconArrowLeft size={14} /> 회원으로
        </Group>
      </Anchor>

      <Paper p="md" radius="lg" shadow="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group gap="xs" align="baseline">
              <Title order={2}>{member?.name ?? '-'}</Title>
              <Text c="dimmed">
                Day {s.dayNumber}
                {s.enrollment ? ` / ${s.enrollment.totalSessions}` : ''}
              </Text>
              {perfMeta && (
                <Badge variant="light" color={perfMeta.color}>
                  {perfMeta.emoji} {perfMeta.label}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {dayjs(s.date).format('YYYY년 M월 D일 (ddd)')}
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack>
            <Card withBorder padding="md">
              <Title order={5} mb="xs">
                🌙 컨디션
              </Title>
              <Group gap="xs" wrap="wrap" mb="xs">
                {checkItems.map(([key, val]) => (
                  <Badge
                    key={key}
                    variant={val ? 'filled' : 'light'}
                    color={val ? 'teal' : 'gray'}
                  >
                    {val ? '✓' : '·'} {CHECK_LABEL[key]}
                  </Badge>
                ))}
              </Group>
              <Stack gap={4}>
                {checks.condition && (
                  <Text size="sm">
                    <Text span fw={500}>
                      컨디션
                    </Text>{' '}
                    {checks.condition}
                  </Text>
                )}
                <Text size="sm">
                  <Text span fw={500}>
                    유산소
                  </Text>{' '}
                  {checks.cardioMinutes}분 ·{' '}
                  <Text span fw={500}>
                    걸음
                  </Text>{' '}
                  {checks.steps.toLocaleString()}
                </Text>
              </Stack>
            </Card>

            <Card withBorder padding="md">
              <Title order={5} mb="xs">
                ⚖️ 신체 측정
              </Title>
              <Table>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td c="dimmed">몸무게</Table.Td>
                    <Table.Td>{s.bodyMetric.weightKg} kg</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td c="dimmed">골격근</Table.Td>
                    <Table.Td>{s.bodyMetric.skeletalMuscleKg} kg</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td c="dimmed">체지방</Table.Td>
                    <Table.Td>{s.bodyMetric.bodyFatKg} kg</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td c="dimmed">체지방률</Table.Td>
                    <Table.Td>{s.bodyMetric.bodyFatPercent} %</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="md">
            <Title order={5} mb="sm">
              💪 운동 ({s.exerciseEntries.length}종)
            </Title>
            {s.exerciseEntries.length === 0 ? (
              <Text c="dimmed" size="sm">
                기록된 운동이 없습니다.
              </Text>
            ) : (
              <Stack gap="md">
                {s.exerciseEntries.map((entry) => {
                  const setsForCalc = entry.sets.map((set) => ({
                    weightKg: set.weightKg || '0',
                    reps: set.reps,
                  }));
                  const vol = totalVolume(setsForCalc);
                  const bestRm = setsForCalc.reduce((best, set) => {
                    const rm = estimateOneRM(set.weightKg, set.reps);
                    return rm > best ? rm : best;
                  }, 0);
                  return (
                    <Card key={entry.id} withBorder padding="sm" bg="gray.0">
                      <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                          <Text fw={600}>{entry.exercise.name}</Text>
                          {entry.bodyPart && (
                            <Badge size="xs" variant="light">
                              {entry.bodyPart.name}
                            </Badge>
                          )}
                        </Group>
                        <Group gap="md">
                          <Text size="xs" c="dimmed">
                            볼륨 {vol.toLocaleString()} kg
                          </Text>
                          <Text size="xs" c="dimmed">
                            1RM {bestRm} kg
                          </Text>
                        </Group>
                      </Group>
                      <Divider my="xs" />
                      <Stack gap={4}>
                        {entry.sets.map((set) => (
                          <Group key={set.id} gap="xs" wrap="nowrap">
                            <Text size="sm" c="dimmed" w={50}>
                              {set.setNumber}세트
                            </Text>
                            <Text size="sm" ff="monospace">
                              {set.weightKg} kg × {set.reps}회
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {s.note && (
        <Card withBorder padding="md">
          <Title order={5} mb="xs">
            📝 한줄평
          </Title>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {s.note}
          </Text>
        </Card>
      )}
    </Stack>
  );
}
