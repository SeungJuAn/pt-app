import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Checkbox,
  Divider,
  Grid,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
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

const CONDITION_OPTIONS = [
  { value: 'good', label: '좋음 😊' },
  { value: 'normal', label: '보통 😐' },
  { value: 'bad', label: '나쁨 😢' },
];

export function SessionCreatePage() {
  const { enrollmentId: enrollmentIdParam, sessionId } = useParams<{
    enrollmentId?: string;
    sessionId?: string;
  }>();
  const isEdit = !!sessionId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // edit 모드일 땐 기존 세션에서 enrollmentId 가져옴
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
  const [check, setCheck] = useState({
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

  // edit 모드: 로드된 세션으로 폼 상태 한 번 채움
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

  const patchSet = (
    entryId: string,
    setId: string,
    patch: Partial<SetInput>,
  ) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.tempId === entryId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.tempId === setId ? { ...s, ...patch } : s,
              ),
            }
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
      createMutation.mutate({
        ...commonPayload,
        enrollmentId: resolvedEnrollmentId,
      });
    }
  };

  if (enrollmentQuery.isLoading || (isEdit && sessionQuery.isLoading))
    return <Loader />;
  if (!enrollmentQuery.data)
    return <Text>등록권을 찾을 수 없습니다.</Text>;
  if (isEdit && !sessionQuery.data)
    return <Text>세션을 찾을 수 없습니다.</Text>;

  const enrollment = enrollmentQuery.data;
  const member = enrollment.member;
  const currentDayNumber = isEdit
    ? sessionQuery.data?.dayNumber ?? 0
    : (enrollment.usedSessions ?? 0) + 1;
  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

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

      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={2}>
            {isEdit ? '세션 수정' : '세션 기록'}
          </Title>
          <Text c="dimmed" size="sm">
            {member?.name ?? '회원'} · Day {currentDayNumber} /{' '}
            {enrollment.totalSessions}
          </Text>
        </Stack>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSubmit}
          loading={isSubmitting}
        >
          저장
        </Button>
      </Group>

      <Grid>
        {/* ───── 사이드 (왼쪽, meta 입력) ───── */}
        <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
          <Stack>
            <Card withBorder padding="sm">
              <Stack gap="xs">
                <DatePickerInput
                  label="날짜"
                  size="sm"
                  valueFormat="YYYY-MM-DD"
                  value={date}
                  onChange={(v) => setDate(v ? new Date(v) : null)}
                />
                <Select
                  label="운동 부위"
                  size="sm"
                  placeholder="선택"
                  data={bodyPartOptions}
                  value={sessionBodyPartId}
                  onChange={(v) => setSessionBodyPartId(v ?? '')}
                  clearable
                />
              </Stack>
            </Card>

            <Card withBorder padding="sm">
              <Text fw={600} size="sm" mb="xs">
                🌙 컨디션
              </Text>
              <SimpleGrid cols={2} spacing={6} verticalSpacing={6}>
                <Checkbox
                  label="숙면"
                  size="sm"
                  checked={check.sleep}
                  onChange={(e) =>
                    setCheck({ ...check, sleep: e.currentTarget.checked })
                  }
                />
                <Checkbox
                  label="식단"
                  size="sm"
                  checked={check.diet}
                  onChange={(e) =>
                    setCheck({ ...check, diet: e.currentTarget.checked })
                  }
                />
                <Checkbox
                  label="금주"
                  size="sm"
                  checked={check.alcoholFree}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      alcoholFree: e.currentTarget.checked,
                    })
                  }
                />
                <Checkbox
                  label="배변"
                  size="sm"
                  checked={check.defecation}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      defecation: e.currentTarget.checked,
                    })
                  }
                />
                <Checkbox
                  label="수분"
                  size="sm"
                  checked={check.hydration}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      hydration: e.currentTarget.checked,
                    })
                  }
                />
              </SimpleGrid>
              <Divider my="xs" />
              <Stack gap="xs">
                <Select
                  label="컨디션"
                  size="sm"
                  data={CONDITION_OPTIONS}
                  value={condition}
                  onChange={(v) => setCondition(v ?? '')}
                  clearable
                />
                <NumberInput
                  label="유산소 (분)"
                  size="sm"
                  min={0}
                  value={cardioMinutes}
                  onChange={setCardioMinutes}
                />
                <NumberInput
                  label="걸음수"
                  size="sm"
                  min={0}
                  value={steps}
                  onChange={setSteps}
                />
              </Stack>
            </Card>

            <Card withBorder padding="sm">
              <Text fw={600} size="sm" mb="xs">
                ⚖️ 신체 측정
              </Text>
              <Stack gap="xs">
                <NumberInput
                  label="몸무게 (kg)"
                  size="sm"
                  decimalScale={2}
                  value={metric.weightKg}
                  onChange={(v) =>
                    setMetric({ ...metric, weightKg: String(v ?? '') })
                  }
                />
                <NumberInput
                  label="골격근 (kg)"
                  size="sm"
                  decimalScale={2}
                  value={metric.skeletalMuscleKg}
                  onChange={(v) =>
                    setMetric({
                      ...metric,
                      skeletalMuscleKg: String(v ?? ''),
                    })
                  }
                />
                <NumberInput
                  label="체지방 (kg)"
                  size="sm"
                  decimalScale={2}
                  value={metric.bodyFatKg}
                  onChange={(v) =>
                    setMetric({ ...metric, bodyFatKg: String(v ?? '') })
                  }
                />
                <NumberInput
                  label="체지방률 (%)"
                  size="sm"
                  decimalScale={2}
                  value={metric.bodyFatPercent}
                  onChange={(v) =>
                    setMetric({
                      ...metric,
                      bodyFatPercent: String(v ?? ''),
                    })
                  }
                />
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        {/* ───── 메인 (오른쪽, 운동 기록) ───── */}
        <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
          <Card withBorder padding="md">
            <Group justify="space-between" mb="sm">
              <Title order={5}>💪 운동</Title>
              <Button
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={addEntry}
              >
                운동 추가
              </Button>
            </Group>

            {entries.length === 0 ? (
              <Text c="dimmed" size="sm">
                운동을 추가하세요.
              </Text>
            ) : (
              <Stack>
                {entries.map((entry) => {
                  const setsForCalc = entry.sets.map((s) => ({
                    weightKg: s.weightKg || '0',
                    reps: Number(s.reps) || 0,
                  }));
                  const vol = totalVolume(setsForCalc);
                  const bestSet = setsForCalc.reduce((best, s) => {
                    const rm = estimateOneRM(s.weightKg, s.reps);
                    return rm > best ? rm : best;
                  }, 0);
                  return (
                    <Card
                      key={entry.tempId}
                      withBorder
                      padding="sm"
                      bg="gray.0"
                    >
                      <Grid align="flex-end">
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                          <Select
                            label="운동"
                            placeholder="선택"
                            searchable
                            data={exerciseOptions}
                            value={entry.exerciseId}
                            onChange={(v) => {
                              const found = exerciseOptions.find(
                                (o) => o.value === v,
                              );
                              patchEntry(entry.tempId, {
                                exerciseId: v ?? '',
                                bodyPartId:
                                  found?.bodyPartId ||
                                  entry.bodyPartId ||
                                  sessionBodyPartId,
                              });
                            }}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 8, sm: 4 }}>
                          <Select
                            label="부위"
                            placeholder="선택"
                            data={bodyPartOptions}
                            value={entry.bodyPartId}
                            onChange={(v) =>
                              patchEntry(entry.tempId, {
                                bodyPartId: v ?? '',
                              })
                            }
                            clearable
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 4, sm: 2 }}>
                          <Group justify="flex-end">
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeEntry(entry.tempId)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Grid.Col>
                      </Grid>

                      <Divider my="sm" />

                      <Stack gap="xs">
                        {entry.sets.map((s, idx) => (
                          <Group key={s.tempId} gap="xs" wrap="nowrap">
                            <Text w={40} size="sm" c="dimmed">
                              {idx + 1}세트
                            </Text>
                            <NumberInput
                              placeholder="무게"
                              decimalScale={2}
                              suffix=" kg"
                              hideControls
                              value={s.weightKg}
                              onChange={(v) =>
                                patchSet(entry.tempId, s.tempId, {
                                  weightKg: String(v ?? ''),
                                })
                              }
                              w={120}
                            />
                            <Text size="sm" c="dimmed">
                              ×
                            </Text>
                            <NumberInput
                              placeholder="횟수"
                              min={0}
                              hideControls
                              value={s.reps}
                              onChange={(v) =>
                                patchSet(entry.tempId, s.tempId, {
                                  reps: String(v ?? ''),
                                })
                              }
                              w={100}
                            />
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() =>
                                removeSet(entry.tempId, s.tempId)
                              }
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        ))}
                        <Button
                          size="xs"
                          variant="subtle"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => addSet(entry.tempId)}
                        >
                          세트 추가
                        </Button>
                      </Stack>

                      <Group justify="flex-end" mt="xs" gap="md">
                        <Text size="xs" c="dimmed">
                          총 볼륨 {vol.toLocaleString()} kg
                        </Text>
                        <Text size="xs" c="dimmed">
                          1RM 추정 {bestSet} kg
                        </Text>
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center" wrap="wrap">
            <Title order={5}>🏋️ 운동 수행 능력 평가</Title>
            <SegmentedControl
              value={performance || ''}
              onChange={(v) => setPerformance(v as SessionPerformance | '')}
              data={[
                { value: '', label: '미평가' },
                { value: 'GOOD', label: '👍 좋음' },
                { value: 'NORMAL', label: '🆗 보통' },
                { value: 'BAD', label: '👎 나쁨' },
              ]}
            />
          </Group>
          <Divider />
          <Title order={5}>📝 한줄평</Title>
          <Textarea
            placeholder="오늘 자세/다음 수업 계획 등"
            autosize
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </Stack>
      </Card>

      <Group justify="flex-end">
        <Button
          size="md"
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSubmit}
          loading={isSubmitting}
        >
          저장
        </Button>
      </Group>
    </Stack>
  );
}
