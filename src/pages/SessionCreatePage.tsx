import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  NumberInput,
  Progress,
  RingProgress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBarbell,
  IconBed,
  IconBottle,
  IconDeviceFloppy,
  IconDroplet,
  IconFlame,
  IconLeaf,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
  IconPlus,
  IconRun,
  IconSalad,
  IconTrash,
  IconBeerOff,
} from '@tabler/icons-react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { bodyPartsApi } from '../api/body-parts';
import { enrollmentsApi } from '../api/enrollments';
import { exercisesApi } from '../api/exercises';
import { sessionsApi, type UpdateSessionDto } from '../api/sessions';
import { estimateOneRM, totalVolume } from '../lib/oneRm';
import type { CreateSessionDto, SessionPerformance } from '../types';

interface SetInput {
  tempId: string;
  weightKg: string;
  reps: string;
}

interface EntryInput {
  tempId: string;
  exerciseId: string;
  bodyPartId: string;
  sets: SetInput[];
}

const newSet = (): SetInput => ({
  tempId: crypto.randomUUID(),
  weightKg: '',
  reps: '',
});

const CHECK_ITEMS = [
  { key: 'sleep', label: '숙면', icon: IconBed },
  { key: 'diet', label: '식단', icon: IconSalad },
  { key: 'alcoholFree', label: '금주', icon: IconBeerOff },
  { key: 'defecation', label: '배변', icon: IconLeaf },
  { key: 'hydration', label: '수분', icon: IconDroplet },
] as const;

type CheckKey = (typeof CHECK_ITEMS)[number]['key'];

const PERFORMANCE_ITEMS = [
  { value: 'GOOD', label: '좋음', icon: IconMoodHappy, color: 'teal' },
  { value: 'NORMAL', label: '보통', icon: IconMoodNeutral, color: 'yellow' },
  { value: 'BAD', label: '나쁨', icon: IconMoodSad, color: 'red' },
] as const;

export function SessionCreatePage() {
  const { enrollmentId: enrollmentIdParam, sessionId } = useParams<{
    enrollmentId?: string;
    sessionId?: string;
  }>();
  const isEdit = !!sessionId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionsApi.get(sessionId as string),
    enabled: isEdit,
  });

  const resolvedEnrollmentId = isEdit
    ? sessionQuery.data?.enrollment?.id ?? ''
    : enrollmentIdParam ?? '';

  const enrollmentQuery = useQuery({
    queryKey: ['enrollment', resolvedEnrollmentId],
    queryFn: () => enrollmentsApi.get(resolvedEnrollmentId),
    enabled: !!resolvedEnrollmentId,
  });

  const bodyPartsQuery = useQuery({
    queryKey: ['body-parts'],
    queryFn: bodyPartsApi.list,
  });

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: exercisesApi.list,
  });

  const [date, setDate] = useState<Date | null>(new Date());
  const [sessionBodyPartId, setSessionBodyPartId] = useState<string>('');
  const [note, setNote] = useState('');
  const [performance, setPerformance] = useState<SessionPerformance | ''>('');
  const [check, setCheck] = useState<Record<CheckKey, boolean>>({
    sleep: false,
    diet: false,
    alcoholFree: false,
    defecation: false,
    hydration: false,
  });
  const [condition, setCondition] = useState<string>('');
  const [cardioMinutes, setCardioMinutes] = useState<string | number>(0);
  const [steps, setSteps] = useState<string | number>(0);
  const [metric, setMetric] = useState({
    weightKg: '',
    skeletalMuscleKg: '',
    bodyFatKg: '',
    bodyFatPercent: '',
  });
  const [entries, setEntries] = useState<EntryInput[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (hydrated) return;
    const s = sessionQuery.data;
    if (!s) return;
    setDate(dayjs(s.date).toDate());
    setNote(s.note ?? '');
    setPerformance(s.performance ?? '');
    setCheck({
      sleep: s.dailyCheck.sleep,
      diet: s.dailyCheck.diet,
      alcoholFree: s.dailyCheck.alcoholFree,
      defecation: s.dailyCheck.defecation,
      hydration: s.dailyCheck.hydration,
    });
    setCondition(s.dailyCheck.condition ?? '');
    setCardioMinutes(s.dailyCheck.cardioMinutes);
    setSteps(s.dailyCheck.steps);
    setMetric({
      weightKg: s.bodyMetric.weightKg,
      skeletalMuscleKg: s.bodyMetric.skeletalMuscleKg,
      bodyFatKg: s.bodyMetric.bodyFatKg,
      bodyFatPercent: s.bodyMetric.bodyFatPercent,
    });
    setEntries(
      s.exerciseEntries.map((e) => ({
        tempId: crypto.randomUUID(),
        exerciseId: e.exercise.id,
        bodyPartId: e.bodyPart?.id ?? '',
        sets: e.sets.map((set) => ({
          tempId: crypto.randomUUID(),
          weightKg: set.weightKg,
          reps: String(set.reps),
        })),
      })),
    );
    setHydrated(true);
  }, [isEdit, hydrated, sessionQuery.data]);

  const bodyPartOptions = useMemo(
    () =>
      (bodyPartsQuery.data ?? []).map((bp) => ({
        value: bp.id,
        label: bp.name,
      })),
    [bodyPartsQuery.data],
  );

  const exerciseOptions = useMemo(
    () =>
      (exercisesQuery.data ?? []).map((e) => ({
        value: e.id,
        label: e.name,
        bodyPartId: e.defaultBodyPart?.id ?? '',
      })),
    [exercisesQuery.data],
  );

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        exerciseId: '',
        bodyPartId: sessionBodyPartId,
        sets: [newSet()],
      },
    ]);
  };

  const patchEntry = (tempId: string, patch: Partial<EntryInput>) => {
    setEntries((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e)),
    );
  };

  const removeEntry = (tempId: string) => {
    setEntries((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const addSet = (entryId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.tempId === entryId ? { ...e, sets: [...e.sets, newSet()] } : e,
      ),
    );
  };

  const patchSet = (entryId: string, setId: string, patch: Partial<SetInput>) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.tempId === entryId
          ? { ...e, sets: e.sets.map((s) => (s.tempId === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  };

  const removeSet = (entryId: string, setId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.tempId === entryId
          ? { ...e, sets: e.sets.filter((s) => s.tempId !== setId) }
          : e,
      ),
    );
  };

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    if (isEdit && sessionId) {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    }
    notifications.show({
      message: isEdit ? '세션이 수정되었습니다.' : '세션이 저장되었습니다.',
      color: 'teal',
    });
    if (isEdit && sessionId) {
      navigate(`/sessions/${sessionId}`);
    } else if (enrollmentQuery.data?.member) {
      navigate(`/members/${enrollmentQuery.data.member.id}`);
    } else {
      navigate('/members');
    }
  };

  const onError = (err: unknown) => {
    notifications.show({
      message: err instanceof Error ? err.message : '저장 실패',
      color: 'red',
    });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateSessionDto) => sessionsApi.create(dto),
    onSuccess,
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSessionDto) =>
      sessionsApi.update(sessionId as string, dto),
    onSuccess,
    onError,
  });

  const onSubmit = () => {
    if (!date) {
      notifications.show({ message: '날짜를 선택하세요', color: 'red' });
      return;
    }
    const validEntries = entries
      .filter((e) => e.exerciseId)
      .map((e, idx) => ({
        exerciseId: e.exerciseId,
        bodyPartId: e.bodyPartId || undefined,
        order: idx,
        sets: e.sets
          .filter((s) => s.reps.trim() !== '')
          .map((s, i) => ({
            setNumber: i + 1,
            weightKg: s.weightKg.trim() || '0',
            reps: Number(s.reps) || 0,
          })),
      }))
      .filter((e) => e.sets.length > 0);

    const commonPayload = {
      date: dayjs(date).format('YYYY-MM-DD'),
      note: note.trim() || undefined,
      performance: performance || undefined,
      dailyCheck: {
        ...check,
        condition: condition || null,
        cardioMinutes: Number(cardioMinutes) || 0,
        steps: Number(steps) || 0,
      },
      bodyMetric: {
        weightKg: metric.weightKg || '0',
        skeletalMuscleKg: metric.skeletalMuscleKg || '0',
        bodyFatKg: metric.bodyFatKg || '0',
        bodyFatPercent: metric.bodyFatPercent || '0',
      },
      exerciseEntries: validEntries,
    };

    if (isEdit) {
      updateMutation.mutate(commonPayload);
    } else {
      createMutation.mutate({ ...commonPayload, enrollmentId: resolvedEnrollmentId });
    }
  };

  if (enrollmentQuery.isLoading || (isEdit && sessionQuery.isLoading))
    return <Loader />;
  if (!enrollmentQuery.data) return <Text>등록권을 찾을 수 없습니다.</Text>;
  if (isEdit && !sessionQuery.data) return <Text>세션을 찾을 수 없습니다.</Text>;

  const enrollment = enrollmentQuery.data;
  const member = enrollment.member;
  const currentDayNumber = isEdit
    ? sessionQuery.data?.dayNumber ?? 0
    : (enrollment.usedSessions ?? 0) + 1;
  const progressPct = Math.min(100, (currentDayNumber / enrollment.totalSessions) * 100);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Stack gap="md">
      {/* 뒤로가기 */}
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

      {/* 진행 배너 */}
      <Card
        padding="lg"
        radius="xl"
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
          color: 'white',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          style={{
            position: 'absolute', bottom: -20, right: 60,
            width: 100, height: 100, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <RingProgress
              size={72}
              thickness={6}
              roundCaps
              sections={[{ value: progressPct, color: 'rgba(255,255,255,0.9)' }]}
              label={
                <Text ta="center" fw={700} size="sm" c="white">
                  {currentDayNumber}
                </Text>
              }
            />
            <Stack gap={2}>
              <Title order={3} c="white">
                {isEdit ? '세션 수정' : '세션 기록'}
              </Title>
              <Text c="rgba(255,255,255,0.85)" size="sm">
                {member?.name} · Day {currentDayNumber} / {enrollment.totalSessions}
              </Text>
              <Progress
                value={progressPct}
                size="xs"
                color="rgba(255,255,255,0.8)"
                bg="rgba(255,255,255,0.2)"
                mt={4}
                w={160}
              />
            </Stack>
          </Group>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={onSubmit}
            loading={isSubmitting}
            variant="white"
            color="teal.7"
            size="md"
            radius="xl"
          >
            저장
          </Button>
        </Group>
      </Card>

      <Grid gutter="md">
        {/* ── 왼쪽 사이드바 ── */}
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
          <Stack gap="md">
            {/* 날짜 + 운동부위 */}
            <Card withBorder radius="xl" padding="md">
              <Stack gap="sm">
                <Group gap={8} mb={2}>
                  <Box
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                      display: 'grid', placeItems: 'center',
                    }}
                  >
                    <IconBarbell size={14} color="white" />
                  </Box>
                  <Text fw={600} size="sm">기본 정보</Text>
                </Group>
                <DatePickerInput
                  label="날짜"
                  size="sm"
                  valueFormat="YYYY-MM-DD"
                  value={date}
                  onChange={(v) => setDate(v ? new Date(v) : null)}
                  radius="lg"
                />
                <Select
                  label="주 운동 부위"
                  size="sm"
                  placeholder="선택"
                  data={bodyPartOptions}
                  value={sessionBodyPartId}
                  onChange={(v) => setSessionBodyPartId(v ?? '')}
                  clearable
                  radius="lg"
                />
              </Stack>
            </Card>

            {/* 컨디션 체크 */}
            <Card withBorder radius="xl" padding="md">
              <Group gap={8} mb="sm">
                <Box
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  <IconMoodHappy size={14} color="white" />
                </Box>
                <Text fw={600} size="sm">오늘의 컨디션</Text>
              </Group>

              {/* 건강 체크 토글 버튼 */}
              <SimpleGrid cols={3} spacing={6} mb="sm">
                {CHECK_ITEMS.map(({ key, label, icon: Icon }) => (
                  <UnstyledButton
                    key={key}
                    onClick={() => setCheck((prev) => ({ ...prev, [key]: !prev[key] }))}
                    style={{
                      borderRadius: 12,
                      padding: '8px 4px',
                      textAlign: 'center',
                      border: `2px solid ${check[key] ? '#0d9488' : '#e2e8f0'}`,
                      background: check[key]
                        ? 'linear-gradient(135deg,rgba(13,148,136,0.12),rgba(8,145,178,0.1))'
                        : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Stack gap={2} align="center">
                      <Icon
                        size={18}
                        color={check[key] ? '#0d9488' : '#94a3b8'}
                        stroke={2}
                      />
                      <Text size="xs" fw={check[key] ? 600 : 400} c={check[key] ? 'teal.7' : 'dimmed'}>
                        {label}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                ))}
              </SimpleGrid>

              {/* 전체 컨디션 */}
              <Text size="xs" fw={500} c="dimmed" mb={6}>전체 컨디션</Text>
              <Group gap={6} mb="sm">
                {[
                  { value: 'good', label: '좋음', color: '#0d9488', icon: IconMoodHappy },
                  { value: 'normal', label: '보통', color: '#d97706', icon: IconMoodNeutral },
                  { value: 'bad', label: '나쁨', color: '#dc2626', icon: IconMoodSad },
                ].map(({ value, label, color, icon: Icon }) => (
                  <UnstyledButton
                    key={value}
                    onClick={() => setCondition(condition === value ? '' : value)}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      padding: '6px 4px',
                      textAlign: 'center',
                      border: `2px solid ${condition === value ? color : '#e2e8f0'}`,
                      background: condition === value ? `${color}18` : 'transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Stack gap={1} align="center">
                      <Icon size={16} color={condition === value ? color : '#94a3b8'} />
                      <Text size="xs" fw={condition === value ? 600 : 400} style={{ color: condition === value ? color : '#94a3b8' }}>
                        {label}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                ))}
              </Group>

              {/* 유산소 + 걸음 */}
              <Group gap="xs">
                <Box style={{ flex: 1 }}>
                  <NumberInput
                    label={
                      <Group gap={4}>
                        <IconFlame size={12} color="#f97316" />
                        <Text size="xs">유산소 (분)</Text>
                      </Group>
                    }
                    size="sm"
                    min={0}
                    value={cardioMinutes}
                    onChange={setCardioMinutes}
                    radius="lg"
                  />
                </Box>
                <Box style={{ flex: 1 }}>
                  <NumberInput
                    label={
                      <Group gap={4}>
                        <IconRun size={12} color="#6366f1" />
                        <Text size="xs">걸음수</Text>
                      </Group>
                    }
                    size="sm"
                    min={0}
                    value={steps}
                    onChange={setSteps}
                    radius="lg"
                  />
                </Box>
              </Group>
            </Card>

            {/* 신체 측정 */}
            <Card withBorder radius="xl" padding="md">
              <Group gap={8} mb="sm">
                <Box
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'linear-gradient(135deg,#ea580c,#f97316)',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  <IconBottle size={14} color="white" />
                </Box>
                <Text fw={600} size="sm">신체 측정</Text>
              </Group>
              <SimpleGrid cols={2} spacing="xs">
                {[
                  { key: 'weightKg', label: '몸무게', unit: 'kg' },
                  { key: 'skeletalMuscleKg', label: '골격근', unit: 'kg' },
                  { key: 'bodyFatKg', label: '체지방', unit: 'kg' },
                  { key: 'bodyFatPercent', label: '체지방률', unit: '%' },
                ].map(({ key, label, unit }) => (
                  <NumberInput
                    key={key}
                    label={<Text size="xs">{label}</Text>}
                    size="sm"
                    decimalScale={2}
                    suffix={` ${unit}`}
                    value={metric[key as keyof typeof metric]}
                    onChange={(v) => setMetric({ ...metric, [key]: String(v ?? '') })}
                    radius="lg"
                    hideControls
                  />
                ))}
              </SimpleGrid>
            </Card>
          </Stack>
        </Grid.Col>

        {/* ── 오른쪽 메인: 운동 기록 ── */}
        <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
          <Card withBorder radius="xl" padding="md">
            <Group justify="space-between" mb="md">
              <Group gap={8}>
                <Box
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  <IconBarbell size={18} color="white" />
                </Box>
                <Stack gap={0}>
                  <Text fw={700} size="sm">운동 목록</Text>
                  <Text size="xs" c="dimmed">{entries.length}종 등록됨</Text>
                </Stack>
              </Group>
              <Button
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={addEntry}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
              >
                운동 추가
              </Button>
            </Group>

            {entries.length === 0 ? (
              <Box
                style={{
                  border: '2px dashed #e2e8f0',
                  borderRadius: 16,
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <IconBarbell size={36} color="#cbd5e1" stroke={1.5} />
                <Text c="dimmed" size="sm" mt="sm">
                  운동 추가 버튼을 눌러 오늘의 운동을 기록하세요
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={12} />}
                  onClick={addEntry}
                  mt="sm"
                  radius="xl"
                >
                  첫 운동 추가
                </Button>
              </Box>
            ) : (
              <Stack gap="sm">
                {entries.map((entry, entryIdx) => {
                  const setsForCalc = entry.sets.map((s) => ({
                    weightKg: s.weightKg || '0',
                    reps: Number(s.reps) || 0,
                  }));
                  const vol = totalVolume(setsForCalc);
                  const bestSet = setsForCalc.reduce((best, s) => {
                    const rm = estimateOneRM(s.weightKg, s.reps);
                    return rm > best ? rm : best;
                  }, 0);
                  const exName = exerciseOptions.find((o) => o.value === entry.exerciseId)?.label;
                  const bpName = bodyPartOptions.find((o) => o.value === entry.bodyPartId)?.label;

                  return (
                    <Card
                      key={entry.tempId}
                      withBorder
                      radius="xl"
                      padding={0}
                      style={{ overflow: 'hidden' }}
                    >
                      {/* 운동 헤더 */}
                      <Box
                        style={{
                          background: 'linear-gradient(135deg,rgba(13,148,136,0.08),rgba(8,145,178,0.06))',
                          borderBottom: '1px solid rgba(13,148,136,0.12)',
                          padding: '10px 14px',
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Group gap="xs" align="center">
                            <Badge
                              size="sm"
                              variant="gradient"
                              gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
                              circle
                            >
                              {entryIdx + 1}
                            </Badge>
                            <Grid align="flex-end" gutter="xs" style={{ flex: 1 }}>
                              <Grid.Col span={{ base: 12, sm: 7 }}>
                                <Select
                                  placeholder="운동 선택"
                                  searchable
                                  data={exerciseOptions}
                                  value={entry.exerciseId}
                                  size="xs"
                                  radius="xl"
                                  onChange={(v) => {
                                    const found = exerciseOptions.find((o) => o.value === v);
                                    patchEntry(entry.tempId, {
                                      exerciseId: v ?? '',
                                      bodyPartId: found?.bodyPartId || entry.bodyPartId || sessionBodyPartId,
                                    });
                                  }}
                                  styles={{ input: { fontWeight: 600 } }}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, sm: 5 }}>
                                <Select
                                  placeholder="부위"
                                  data={bodyPartOptions}
                                  value={entry.bodyPartId}
                                  size="xs"
                                  radius="xl"
                                  onChange={(v) => patchEntry(entry.tempId, { bodyPartId: v ?? '' })}
                                  clearable
                                />
                              </Grid.Col>
                            </Grid>
                          </Group>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() => removeEntry(entry.tempId)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Box>

                      {/* 세트 목록 */}
                      <Stack gap={0} p="sm">
                        {/* 세트 헤더 */}
                        <Group gap="xs" px={4} mb={6}>
                          <Text size="xs" c="dimmed" w={36} ta="center">세트</Text>
                          <Text size="xs" c="dimmed" style={{ flex: 1 }}>무게 (kg)</Text>
                          <Text size="xs" c="dimmed" w={80}>횟수</Text>
                          <Box w={28} />
                        </Group>

                        {entry.sets.map((s, idx) => (
                          <Box
                            key={s.tempId}
                            style={{
                              borderRadius: 10,
                              padding: '6px 4px',
                              background: idx % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'transparent',
                              marginBottom: 2,
                            }}
                          >
                            <Group gap="xs" wrap="nowrap" align="center">
                              <Box
                                style={{
                                  width: 28, height: 28, borderRadius: 8,
                                  background: 'linear-gradient(135deg,#0d9488,#0891b2)',
                                  display: 'grid', placeItems: 'center', flexShrink: 0,
                                }}
                              >
                                <Text size="xs" fw={700} c="white">{idx + 1}</Text>
                              </Box>
                              <NumberInput
                                placeholder="0"
                                decimalScale={2}
                                hideControls
                                value={s.weightKg}
                                onChange={(v) =>
                                  patchSet(entry.tempId, s.tempId, { weightKg: String(v ?? '') })
                                }
                                size="xs"
                                radius="lg"
                                style={{ flex: 1 }}
                                styles={{ input: { textAlign: 'center', fontFamily: 'monospace' } }}
                              />
                              <Text size="sm" c="dimmed" fw={500}>×</Text>
                              <NumberInput
                                placeholder="0"
                                min={0}
                                hideControls
                                value={s.reps}
                                onChange={(v) =>
                                  patchSet(entry.tempId, s.tempId, { reps: String(v ?? '') })
                                }
                                size="xs"
                                radius="lg"
                                w={72}
                                styles={{ input: { textAlign: 'center', fontFamily: 'monospace' } }}
                              />
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                onClick={() => removeSet(entry.tempId, s.tempId)}
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </Group>
                          </Box>
                        ))}

                        <Group justify="space-between" mt="xs" px={4}>
                          <Button
                            size="xs"
                            variant="subtle"
                            color="teal"
                            leftSection={<IconPlus size={12} />}
                            onClick={() => addSet(entry.tempId)}
                            radius="xl"
                          >
                            세트 추가
                          </Button>
                          <Group gap="md">
                            {vol > 0 && (
                              <Badge size="xs" variant="light" color="teal" radius="xl">
                                볼륨 {vol.toLocaleString()} kg
                              </Badge>
                            )}
                            {bestSet > 0 && (
                              <Badge size="xs" variant="light" color="indigo" radius="xl">
                                1RM {bestSet} kg
                              </Badge>
                            )}
                            {exName && (
                              <Text size="xs" c="dimmed">{exName}{bpName ? ` · ${bpName}` : ''}</Text>
                            )}
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* 평가 & 메모 */}
      <Card withBorder radius="xl" padding="lg">
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Group gap={8} mb="sm">
              <Box
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  display: 'grid', placeItems: 'center',
                }}
              >
                <IconMoodHappy size={14} color="white" />
              </Box>
              <Text fw={600} size="sm">수행 능력 평가</Text>
            </Group>
            <Group gap="sm">
              {PERFORMANCE_ITEMS.map(({ value, label, icon: Icon, color }) => (
                <UnstyledButton
                  key={value}
                  onClick={() =>
                    setPerformance(performance === value ? '' : (value as SessionPerformance))
                  }
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    padding: '12px 8px',
                    textAlign: 'center',
                    border: `2px solid ${performance === value
                      ? (color === 'teal' ? '#0d9488' : color === 'yellow' ? '#d97706' : '#dc2626')
                      : '#e2e8f0'}`,
                    background: performance === value
                      ? (color === 'teal' ? 'rgba(13,148,136,0.1)'
                        : color === 'yellow' ? 'rgba(217,119,6,0.1)'
                        : 'rgba(220,38,38,0.1)')
                      : 'transparent',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Stack gap={4} align="center">
                    <Icon
                      size={24}
                      color={performance === value
                        ? (color === 'teal' ? '#0d9488'
                          : color === 'yellow' ? '#d97706'
                          : '#dc2626')
                        : '#94a3b8'}
                    />
                    <Text
                      size="sm"
                      fw={performance === value ? 700 : 400}
                      c={performance === value
                        ? (color === 'teal' ? 'teal.7'
                          : color === 'yellow' ? 'yellow.7'
                          : 'red.7')
                        : 'dimmed'}
                    >
                      {label}
                    </Text>
                  </Stack>
                </UnstyledButton>
              ))}
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Group gap={8} mb="sm">
              <Box
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg,#0891b2,#0e7490)',
                  display: 'grid', placeItems: 'center',
                }}
              >
                <IconRun size={14} color="white" />
              </Box>
              <Text fw={600} size="sm">트레이너 메모</Text>
            </Group>
            <Textarea
              placeholder="자세 교정 포인트, 다음 수업 계획 등..."
              autosize
              minRows={3}
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              radius="lg"
            />
          </Grid.Col>
        </Grid>
      </Card>

      <Group justify="flex-end">
        <Button
          size="lg"
          leftSection={<IconDeviceFloppy size={18} />}
          onClick={onSubmit}
          loading={isSubmitting}
          radius="xl"
          variant="gradient"
          gradient={{ from: 'teal.6', to: 'cyan.5', deg: 135 }}
          px={32}
        >
          {isEdit ? '세션 수정 완료' : '세션 저장'}
        </Button>
      </Group>
    </Stack>
  );
}
