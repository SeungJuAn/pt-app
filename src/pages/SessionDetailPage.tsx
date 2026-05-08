import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Loader,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconBed,
  IconBottle,
  IconDroplet,
  IconFlame,
  IconLeaf,
  IconPencil,
  IconRun,
  IconSalad,
  IconTrash,
  IconBeerOff,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router';
import { sessionsApi } from '../api/sessions';
import { estimateOneRM, totalVolume } from '../lib/oneRm';
import type { SessionPerformance } from '../types';

const PERF_META: Record<SessionPerformance, { label: string; color: string; emoji: string; bg: string }> = {
  GOOD: { label: '좋음', color: '#0d9488', emoji: '👍', bg: 'rgba(13,148,136,0.1)' },
  NORMAL: { label: '보통', color: '#d97706', emoji: '🆗', bg: 'rgba(217,119,6,0.1)' },
  BAD: { label: '나쁨', color: '#dc2626', emoji: '👎', bg: 'rgba(220,38,38,0.1)' },
};

const CHECK_ITEMS = [
  { key: 'sleep', label: '숙면', icon: IconBed },
  { key: 'diet', label: '식단', icon: IconSalad },
  { key: 'alcoholFree', label: '금주', icon: IconBeerOff },
  { key: 'defecation', label: '배변', icon: IconLeaf },
  { key: 'hydration', label: '수분', icon: IconDroplet },
] as const;

const CONDITION_LABEL: Record<string, string> = {
  good: '😊 좋음',
  normal: '😐 보통',
  bad: '😢 나쁨',
};

export function SessionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.get(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => sessionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      notifications.show({ message: '삭제되었습니다.', color: 'teal' });
      const memberId = sessionQuery.data?.enrollment?.member?.id;
      navigate(memberId ? `/members/${memberId}` : '/members');
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof Error ? err.message : '삭제 실패',
        color: 'red',
      });
    },
  });

  if (sessionQuery.isLoading) return <Loader />;
  if (!sessionQuery.data) return <Text>세션을 찾을 수 없습니다.</Text>;

  const s = sessionQuery.data;
  const member = s.enrollment?.member;
  const perfMeta = s.performance ? PERF_META[s.performance] : null;
  const checks = s.dailyCheck;
  const progressPct = s.enrollment
    ? Math.min(100, (s.dayNumber / s.enrollment.totalSessions) * 100)
    : 0;

  // 전체 세션 볼륨 합계
  const totalVol = s.exerciseEntries.reduce((sum, entry) => {
    const sets = entry.sets.map((set) => ({ weightKg: set.weightKg || '0', reps: set.reps }));
    return sum + totalVolume(sets);
  }, 0);

  return (
    <Stack gap="md">
      <Anchor
        component={Link}
        to={member ? `/members/${member.id}` : '/members'}
        size="sm"
        c="dimmed"
      >
        <Group gap={4}>
          <IconArrowLeft size={14} /> {member?.name ?? '회원'}으로 돌아가기
        </Group>
      </Anchor>

      {/* 세션 헤더 배너 */}
      <Card
        radius="xl"
        padding="lg"
        style={{
          background: 'linear-gradient(135deg,#0d9488 0%,#0891b2 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <RingProgress
              size={72}
              thickness={6}
              roundCaps
              sections={[{ value: progressPct, color: 'rgba(255,255,255,0.9)' }]}
              label={
                <Text ta="center" fw={700} size="sm" c="white">{s.dayNumber}</Text>
              }
            />
            <Stack gap={4}>
              <Group gap="xs" align="center">
                <Title order={3} c="white">{member?.name ?? '-'}</Title>
                <Text c="rgba(255,255,255,0.75)" size="sm">
                  Day {s.dayNumber}{s.enrollment ? ` / ${s.enrollment.totalSessions}` : ''}
                </Text>
              </Group>
              <Text c="rgba(255,255,255,0.85)" size="sm">
                {dayjs(s.date).format('YYYY년 M월 D일 (ddd)')}
              </Text>
              {perfMeta && (
                <Box
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    padding: '3px 10px',
                    width: 'fit-content',
                  }}
                >
                  <Text size="sm">{perfMeta.emoji}</Text>
                  <Text size="sm" c="white" fw={600}>{perfMeta.label}</Text>
                </Box>
              )}
            </Stack>
          </Group>

          {/* 요약 스탯 */}
          <Group gap="lg">
            <Stack gap={0} align="center">
              <Text fw={700} size="xl" c="white">{s.exerciseEntries.length}</Text>
              <Text size="xs" c="rgba(255,255,255,0.75)">종목</Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text fw={700} size="xl" c="white">{totalVol.toLocaleString()}</Text>
              <Text size="xs" c="rgba(255,255,255,0.75)">총 볼륨 kg</Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Button
              variant="white"
              color="teal.7"
              leftSection={<IconPencil size={14} />}
              onClick={() => navigate(`/sessions/${s.id}/edit`)}
              radius="xl"
              size="sm"
            >
              수정
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              loading={deleteMutation.isPending}
              onClick={() => {
                if (confirm('이 세션 기록을 삭제할까요?')) deleteMutation.mutate();
              }}
              radius="xl"
              size="sm"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              삭제
            </Button>
          </Group>
        </Group>
      </Card>

      <Grid gap="md">
        {/* 왼쪽: 컨디션 + 신체 */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="md">
            {/* 컨디션 */}
            <Card withBorder radius="xl" padding="md">
              <Group gap={8} mb="sm">
                <Box style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'grid', placeItems: 'center' }}>
                  <Text size="sm">🌙</Text>
                </Box>
                <Text fw={600} size="sm">오늘의 컨디션</Text>
              </Group>

              <SimpleGrid cols={5} spacing={6} mb="sm">
                {CHECK_ITEMS.map(({ key, label, icon: Icon }) => {
                  const active = checks[key];
                  return (
                    <Stack key={key} gap={2} align="center"
                      style={{
                        padding: '8px 4px', borderRadius: 12,
                        background: active ? 'rgba(13,148,136,0.1)' : 'rgba(248,250,252,0.8)',
                        border: `1px solid ${active ? 'rgba(13,148,136,0.25)' : '#e2e8f0'}`,
                      }}
                    >
                      <Icon size={16} color={active ? '#0d9488' : '#cbd5e1'} stroke={2} />
                      <Text size="xs" fw={active ? 600 : 400} c={active ? 'teal.7' : 'dimmed'}>
                        {label}
                      </Text>
                    </Stack>
                  );
                })}
              </SimpleGrid>

              <Divider my="xs" />

              <Grid gap="xs">
                {checks.condition && (
                  <Grid.Col span={12}>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed" fw={500}>전체 컨디션</Text>
                      <Badge variant="light" color="violet" size="sm" radius="sm">
                        {CONDITION_LABEL[checks.condition] ?? checks.condition}
                      </Badge>
                    </Group>
                  </Grid.Col>
                )}
                <Grid.Col span={6}>
                  <Box style={{ background: 'rgba(249,115,22,0.06)', borderRadius: 12, padding: '8px 12px' }}>
                    <Group gap={6}>
                      <IconFlame size={14} color="#f97316" />
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">유산소</Text>
                        <Text size="sm" fw={600}>{checks.cardioMinutes}분</Text>
                      </Stack>
                    </Group>
                  </Box>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Box style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 12, padding: '8px 12px' }}>
                    <Group gap={6}>
                      <IconRun size={14} color="#6366f1" />
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">걸음수</Text>
                        <Text size="sm" fw={600}>{checks.steps.toLocaleString()}</Text>
                      </Stack>
                    </Group>
                  </Box>
                </Grid.Col>
              </Grid>
            </Card>

            {/* 신체 측정 */}
            <Card withBorder radius="xl" padding="md">
              <Group gap={8} mb="sm">
                <Box style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#ea580c,#f97316)', display: 'grid', placeItems: 'center' }}>
                  <IconBottle size={14} color="white" />
                </Box>
                <Text fw={600} size="sm">신체 측정</Text>
              </Group>
              <SimpleGrid cols={2} spacing="xs">
                {[
                  { label: '몸무게', value: `${s.bodyMetric.weightKg} kg`, color: '#0d9488' },
                  { label: '골격근', value: `${s.bodyMetric.skeletalMuscleKg} kg`, color: '#7c3aed' },
                  { label: '체지방', value: `${s.bodyMetric.bodyFatKg} kg`, color: '#f97316' },
                  { label: '체지방률', value: `${s.bodyMetric.bodyFatPercent} %`, color: '#dc2626' },
                ].map(({ label, value, color }) => (
                  <Box
                    key={label}
                    style={{
                      borderRadius: 12,
                      padding: '10px 14px',
                      background: `${color}0d`,
                      border: `1px solid ${color}22`,
                    }}
                  >
                    <Text size="xs" c="dimmed" mb={2}>{label}</Text>
                    <Text fw={700} size="md" style={{ color }}>{value}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Card>
          </Stack>
        </Grid.Col>

        {/* 오른쪽: 운동 목록 */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="xl" padding="md">
            <Group gap={8} mb="md">
              <Box style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#0d9488,#0891b2)', display: 'grid', placeItems: 'center' }}>
                <Text size="sm">💪</Text>
              </Box>
              <Text fw={700} size="md">운동 기록</Text>
              <Badge variant="light" color="teal" size="md">{s.exerciseEntries.length}종목</Badge>
            </Group>

            {s.exerciseEntries.length === 0 ? (
              <Text c="dimmed" size="sm" ta="center" py="lg">기록된 운동이 없습니다.</Text>
            ) : (
              <Stack gap="sm">
                {s.exerciseEntries.map((entry, idx) => {
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
                    <Card key={entry.id} withBorder radius="xl" padding={0} style={{ overflow: 'hidden' }}>
                      <Box
                        style={{
                          background: 'linear-gradient(135deg,rgba(13,148,136,0.07),rgba(8,145,178,0.05))',
                          borderBottom: '1px solid rgba(13,148,136,0.1)',
                          padding: '14px 18px',
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Group gap="sm">
                            <Badge
                              size="md"
                              variant="gradient"
                              gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
                              circle
                            >
                              {idx + 1}
                            </Badge>
                            <Text fw={700} size="md">{entry.exercise.name}</Text>
                            {entry.bodyPart && (
                              <Badge size="sm" variant="light" color="teal" radius="sm">
                                {entry.bodyPart.name}
                              </Badge>
                            )}
                          </Group>
                          <Group gap="sm">
                            {vol > 0 && (
                              <Badge size="sm" variant="light" color="teal" radius="xl">
                                볼륨 {vol.toLocaleString()} kg
                              </Badge>
                            )}
                            {bestRm > 0 && (
                              <Badge size="sm" variant="light" color="indigo" radius="xl">
                                1RM {bestRm} kg
                              </Badge>
                            )}
                          </Group>
                        </Group>
                      </Box>

                      <Stack gap={0} p="md">
                        <Group gap="sm" px={4} mb={8}>
                          <Text size="sm" c="dimmed" w={40} ta="center">세트</Text>
                          <Text size="sm" c="dimmed" style={{ flex: 1 }}>무게</Text>
                          <Text size="sm" c="dimmed" w={70}>횟수</Text>
                        </Group>
                        {entry.sets.map((set, setIdx) => (
                          <Box
                            key={set.id}
                            style={{
                              borderRadius: 10, padding: '8px 6px',
                              background: setIdx % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'transparent',
                            }}
                          >
                            <Group gap="sm" wrap="nowrap" align="center">
                              <Box
                                style={{
                                  width: 30, height: 30, borderRadius: 8,
                                  background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                                  display: 'grid', placeItems: 'center', flexShrink: 0,
                                }}
                              >
                                <Text size="sm" fw={700} c="white">{set.setNumber}</Text>
                              </Box>
                              <Text size="md" fw={500} ff="monospace" style={{ flex: 1 }}>
                                {set.weightKg} kg
                              </Text>
                              <Text size="md" c="dimmed">×</Text>
                              <Text size="md" fw={700} ff="monospace" w={56}>
                                {set.reps}회
                              </Text>
                            </Group>
                          </Box>
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

      {/* 트레이너 메모 */}
      <Card withBorder radius="xl" padding="md">
        <Group gap={8} mb="sm">
          <Box style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#0891b2,#0e7490)', display: 'grid', placeItems: 'center' }}>
            <Text size="sm">📝</Text>
          </Box>
          <Text fw={600} size="sm">트레이너 메모</Text>
        </Group>
        {s.note ? (
          <Box
            style={{
              background: 'rgba(248,250,252,0.8)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid rgba(226,232,240,0.8)',
            }}
          >
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{s.note}</Text>
          </Box>
        ) : (
          <Text size="sm" c="dimmed">
            기록된 메모가 없습니다.{' '}
            <Anchor size="sm" onClick={() => navigate(`/sessions/${s.id}/edit`)}>
              수정에서 추가
            </Anchor>
          </Text>
        )}
      </Card>
    </Stack>
  );
}
