import { useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Indicator,
  Loader,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { Calendar, DatePickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCalendarEvent,
  IconChartBar,
  IconClock,
  IconPlus,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { appointmentsApi } from '../api/appointments';
import { membersApi } from '../api/members';
import { MemberHistoryModal } from '../components/MemberHistoryModal';
import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  CreateAppointmentDto,
} from '../types';

const KIND_LABEL: Record<AppointmentKind, string> = {
  CONSULTATION: '상담',
  SESSION: 'PT 세션',
};

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; color: string }
> = {
  SCHEDULED: { label: '예정', color: 'teal' },
  COMPLETED: { label: '완료', color: 'gray' },
  CANCELED: { label: '취소', color: 'red' },
  NO_SHOW: { label: '불참', color: 'orange' },
};

interface FormValues {
  memberId: string | null;
  date: Date | null;
  time: string;
  kind: AppointmentKind;
  durationMin: number | '';
  note: string;
}

function toDateKey(d: Date | string): string {
  return dayjs(d).format('YYYY-MM-DD');
}

export function HomePage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [viewMonth, setViewMonth] = useState<string>(
    dayjs().startOf('month').format('YYYY-MM-DD'),
  );
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [
    historyOpened,
    { open: openHistory, close: closeHistory },
  ] = useDisclosure(false);
  const timeRef = useRef<HTMLInputElement>(null);

  const showHistory = (id: string) => {
    setHistoryMemberId(id);
    openHistory();
  };

  const monthKey = dayjs(viewMonth).format('YYYY-MM');
  const rangeFrom = dayjs(viewMonth)
    .startOf('month')
    .subtract(7, 'day')
    .toISOString();
  const rangeTo = dayjs(viewMonth)
    .endOf('month')
    .add(7, 'day')
    .toISOString();

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', monthKey],
    queryFn: () => appointmentsApi.listRange(rangeFrom, rangeTo),
  });

  const membersQuery = useQuery({
    queryKey: ['members', 'all'],
    queryFn: membersApi.listAll,
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointmentsQuery.data ?? []) {
      const key = toDateKey(a.startAt);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appointmentsQuery.data]);

  const selectedAppointments = (byDate.get(selectedDate) ?? []).sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );

  const form = useForm<FormValues>({
    initialValues: {
      memberId: null,
      date: new Date(),
      time: '10:00',
      kind: 'SESSION',
      durationMin: 60,
      note: '',
    },
    validate: {
      date: (v) => (v ? null : '날짜를 선택하세요'),
      time: (v) => (/^\d{2}:\d{2}$/.test(v) ? null : '시간을 입력하세요'),
      durationMin: (v) =>
        typeof v === 'number' && v >= 10 && v <= 600
          ? null
          : '10~600분 사이로 입력하세요',
    },
  });

  const openCreate = (date?: string) => {
    setEditing(null);
    form.setValues({
      memberId: null,
      date: date ? dayjs(date).toDate() : new Date(),
      time: '10:00',
      kind: 'SESSION',
      durationMin: 60,
      note: '',
    });
    open();
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    form.setValues({
      memberId: a.member?.id ?? null,
      date: dayjs(a.startAt).toDate(),
      time: dayjs(a.startAt).format('HH:mm'),
      kind: a.kind,
      durationMin: a.durationMin,
      note: a.note ?? '',
    });
    open();
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateAppointmentDto) => appointmentsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      notifications.show({ message: '일정이 추가되었습니다.', color: 'teal' });
      close();
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof Error ? err.message : '추가 실패',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof appointmentsApi.update>[1] }) =>
      appointmentsApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      close();
    },
    onError: (err) => {
      notifications.show({
        message: err instanceof Error ? err.message : '수정 실패',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      notifications.show({ message: '삭제되었습니다.', color: 'teal' });
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.date) return;
    const [hh, mm] = values.time.split(':').map(Number);
    const startAt = dayjs(values.date)
      .hour(hh)
      .minute(mm)
      .second(0)
      .millisecond(0)
      .toISOString();
    const payload = {
      memberId: values.memberId || undefined,
      startAt,
      durationMin:
        typeof values.durationMin === 'number' ? values.durationMin : 60,
      kind: values.kind,
      note: values.note.trim() || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, dto: payload });
    } else {
      createMutation.mutate(payload);
    }
    setSelectedDate(toDateKey(values.date));
  };

  const memberOptions =
    membersQuery.data?.map((m) => ({ value: m.id, label: m.name })) ?? [];

  const todayCount = byDate.get(today)?.length ?? 0;
  const monthCount = appointmentsQuery.data?.length ?? 0;
  const scheduledInMonth =
    appointmentsQuery.data?.filter((a) => a.status === 'SCHEDULED').length ?? 0;

  return (
    <Stack>
      <Card className="app-hero-card" padding="lg" radius="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Group gap="md" align="flex-start">
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <IconCalendarEvent size={26} />
            </Box>
            <Stack gap={4}>
              <Title order={2}>대시보드</Title>
              <Group gap="lg" className="app-hero-sub">
                <Text size="sm">
                  오늘 일정 <b>{todayCount}</b>건
                </Text>
                <Text size="sm">
                  이번 달 <b>{monthCount}</b>건 · 예정 <b>{scheduledInMonth}</b>건
                </Text>
              </Group>
            </Stack>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => openCreate(selectedDate)}
            color="white"
            variant="white"
            c="teal.7"
          >
            일정 추가
          </Button>
        </Group>
      </Card>

      <Grid>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="md">
            <Calendar
              date={viewMonth}
              onDateChange={(d) => setViewMonth(d)}
              static={false}
              fullWidth
              size="md"
              getDayProps={(date) => ({
                selected: date === selectedDate,
                onClick: () => setSelectedDate(date),
              })}
              renderDay={(date) => {
                const day = dayjs(date).date();
                const count = byDate.get(date)?.length ?? 0;
                return (
                  <Indicator
                    size={6}
                    color="teal"
                    offset={-4}
                    disabled={count === 0}
                  >
                    <div>{day}</div>
                  </Indicator>
                );
              }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder padding="md">
            <Stack>
              <Group justify="space-between" align="center">
                <Stack gap={0}>
                  <Text fw={600} size="lg">
                    {dayjs(selectedDate).format('YYYY년 M월 D일 (ddd)')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {selectedAppointments.length > 0
                      ? `일정 ${selectedAppointments.length}건`
                      : '일정 없음'}
                  </Text>
                </Stack>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => openCreate(selectedDate)}
                >
                  추가
                </Button>
              </Group>

              {appointmentsQuery.isLoading ? (
                <Loader size="sm" />
              ) : selectedAppointments.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="md">
                  선택한 날짜에 일정이 없습니다.
                </Text>
              ) : (
                <Stack gap="xs">
                  {selectedAppointments.map((a) => {
                    const meta = STATUS_META[a.status];
                    const endAt = dayjs(a.startAt).add(
                      a.durationMin,
                      'minute',
                    );
                    return (
                      <Card
                        key={a.id}
                        withBorder
                        padding="sm"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openEdit(a)}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" wrap="nowrap">
                              <IconClock size={14} />
                              <Text size="sm" fw={500}>
                                {dayjs(a.startAt).format('HH:mm')} –{' '}
                                {endAt.format('HH:mm')}
                              </Text>
                              <Badge
                                size="xs"
                                variant="light"
                                color={a.kind === 'SESSION' ? 'blue' : 'grape'}
                              >
                                {KIND_LABEL[a.kind]}
                              </Badge>
                              <Badge
                                size="xs"
                                variant="light"
                                color={meta.color}
                              >
                                {meta.label}
                              </Badge>
                            </Group>
                            <Group gap={6} wrap="nowrap">
                              <IconUser size={14} />
                              <Text size="sm" truncate>
                                {a.member?.name ?? '-'}
                              </Text>
                            </Group>
                            {a.note && (
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {a.note}
                              </Text>
                            )}
                          </Stack>
                          <Stack gap={4}>
                            {a.member && (
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="teal"
                                title="진행 현황"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showHistory(a.member!.id);
                                }}
                              >
                                <IconChartBar size={14} />
                              </ActionIcon>
                            )}
                            {a.status === 'SCHEDULED' && (
                              <>
                                <Button
                                  size="compact-xs"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({
                                      id: a.id,
                                      dto: { status: 'COMPLETED' },
                                    });
                                  }}
                                >
                                  완료
                                </Button>
                                <Button
                                  size="compact-xs"
                                  variant="subtle"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMutation.mutate({
                                      id: a.id,
                                      dto: { status: 'CANCELED' },
                                    });
                                  }}
                                >
                                  취소
                                </Button>
                              </>
                            )}
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('이 일정을 삭제할까요?')) {
                                  deleteMutation.mutate(a.id);
                                }
                              }}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Stack>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <MemberHistoryModal
        memberId={historyMemberId}
        opened={historyOpened}
        onClose={closeHistory}
      />

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? '일정 수정' : '일정 추가'}
        centered
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <SegmentedControl
              fullWidth
              data={[
                { value: 'SESSION', label: 'PT 세션' },
                { value: 'CONSULTATION', label: '상담' },
              ]}
              {...form.getInputProps('kind')}
            />
            <Select
              label="회원"
              placeholder="선택 (상담 신규 문의 등은 비워두기 가능)"
              searchable
              clearable
              data={memberOptions}
              {...form.getInputProps('memberId')}
            />
            <Group grow>
              <DatePickerInput
                label="날짜"
                valueFormat="YYYY-MM-DD"
                required
                {...form.getInputProps('date')}
              />
              <TimeInput
                ref={timeRef}
                label="시작 시간"
                required
                {...form.getInputProps('time')}
              />
            </Group>
            <NumberInput
              label="소요 시간 (분)"
              min={10}
              max={600}
              step={15}
              {...form.getInputProps('durationMin')}
            />
            <Textarea
              label="메모"
              placeholder="특이사항, 준비물, 목표 등"
              autosize
              minRows={2}
              {...form.getInputProps('note')}
            />
            <Group justify="space-between">
              {editing ? (
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    if (confirm('이 일정을 삭제할까요?')) {
                      deleteMutation.mutate(editing.id);
                      close();
                    }
                  }}
                >
                  삭제
                </Button>
              ) : (
                <span />
              )}
              <Group>
                <Button variant="subtle" onClick={close}>
                  취소
                </Button>
                <Button
                  type="submit"
                  loading={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  저장
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
