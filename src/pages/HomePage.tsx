import { useMemo, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Avatar,
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
  Progress,
  RingProgress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { Calendar, DatePickerInput, TimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconChartBar,
  IconClock,
  IconHistory,
  IconNotebook,
  IconPlus,
  IconTrash,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Link } from "react-router";
import { appointmentsApi } from "../api/appointments";
import { enrollmentsApi } from "../api/enrollments";
import { membersApi } from "../api/members";
import { sessionsApi } from "../api/sessions";
import { MemberHistoryModal } from "../components/MemberHistoryModal";
import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  CreateAppointmentDto,
} from "../types";

const KIND_LABEL: Record<AppointmentKind, string> = {
  CONSULTATION: "상담",
  SESSION: "PT 세션",
};

const STATUS_META: Record<AppointmentStatus, { label: string; color: string }> = {
  SCHEDULED: { label: "예정", color: "teal" },
  COMPLETED: { label: "완료", color: "gray" },
  CANCELED: { label: "취소", color: "red" },
  NO_SHOW: { label: "불참", color: "orange" },
};

const PERF_META: Record<string, { label: string; color: string }> = {
  GOOD: { label: "👍 좋음", color: "teal" },
  NORMAL: { label: "🆗 보통", color: "gray" },
  BAD: { label: "👎 나쁨", color: "red" },
};

const AVATAR_COLORS = ["teal","cyan","blue","indigo","violet","grape","pink","orange"] as const;
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  if (/[가-힣]/.test(t)) return t.length > 2 ? t.slice(-2) : t;
  return t.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

interface FormValues {
  memberId: string | null;
  date: Date | null;
  time: string;
  kind: AppointmentKind;
  durationMin: number | "";
  note: string;
}

function toDateKey(d: Date | string): string {
  return dayjs(d).format("YYYY-MM-DD");
}

export function HomePage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [viewMonth, setViewMonth] = useState<string>(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);

  const showHistory = (id: string) => { setHistoryMemberId(id); openHistory(); };

  const monthKey = dayjs(viewMonth).format("YYYY-MM");
  const rangeFrom = dayjs(viewMonth).startOf("month").subtract(7, "day").toISOString();
  const rangeTo = dayjs(viewMonth).endOf("month").add(7, "day").toISOString();

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", monthKey],
    queryFn: () => appointmentsApi.listRange(rangeFrom, rangeTo),
  });

  const membersQuery = useQuery({
    queryKey: ["members", "all"],
    queryFn: membersApi.listAll,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments", "all"],
    queryFn: enrollmentsApi.listAll,
  });

  const recentSessionsQuery = useQuery({
    queryKey: ["sessions", "recent"],
    queryFn: () => sessionsApi.listRecent(6),
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

  // 회원 레벨 집계
  const memberStats = useMemo(() => {
    const all = membersQuery.data ?? [];
    return {
      total: all.length,
      active: all.filter((m) => m.level === "ACTIVE").length,
      consultation: all.filter((m) => m.level === "CONSULTATION").length,
      dormant: all.filter((m) => m.level === "DORMANT").length,
    };
  }, [membersQuery.data]);

  // 수강권 소진 임박 (남은 횟수 ≤ 3, ACTIVE)
  const nearlyDoneEnrollments = useMemo(() => {
    return (enrollmentsQuery.data ?? [])
      .filter((e) => {
        if (e.status !== "ACTIVE") return false;
        const remaining = e.totalSessions - (e.usedSessions ?? 0);
        return remaining <= 3 && remaining >= 0;
      })
      .sort((a, b) => {
        const ra = a.totalSessions - (a.usedSessions ?? 0);
        const rb = b.totalSessions - (b.usedSessions ?? 0);
        return ra - rb;
      });
  }, [enrollmentsQuery.data]);

  const form = useForm<FormValues>({
    initialValues: { memberId: null, date: new Date(), time: "10:00", kind: "SESSION", durationMin: 60, note: "" },
    validate: {
      date: (v) => (v ? null : "날짜를 선택하세요"),
      time: (v) => (/^\d{2}:\d{2}(?::\d{2})?$/.test(v) ? null : "시간을 입력하세요"),
      durationMin: (v) =>
        typeof v === "number" && v >= 10 && v <= 600 ? null : "10~600분 사이로 입력하세요",
    },
  });

  const openCreate = (date?: string) => {
    setEditing(null);
    form.setValues({ memberId: null, date: date ? dayjs(date).toDate() : new Date(), time: "10:00", kind: "SESSION", durationMin: 60, note: "" });
    open();
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    form.setValues({ memberId: a.member?.id ?? null, date: dayjs(a.startAt).toDate(), time: dayjs(a.startAt).format("HH:mm"), kind: a.kind, durationMin: a.durationMin, note: a.note ?? "" });
    open();
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateAppointmentDto) => appointmentsApi.create(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); notifications.show({ message: "일정이 추가되었습니다.", color: "teal" }); close(); },
    onError: (err) => { notifications.show({ message: err instanceof Error ? err.message : "추가 실패", color: "red" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof appointmentsApi.update>[1] }) =>
      appointmentsApi.update(id, dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); close(); },
    onError: (err) => { notifications.show({ message: err instanceof Error ? err.message : "수정 실패", color: "red" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); notifications.show({ message: "삭제되었습니다.", color: "teal" }); },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.date) return;
    const parts = values.time.split(":").map(Number);
    const startAt = dayjs(values.date).hour(parts[0] ?? 0).minute(parts[1] ?? 0).second(0).millisecond(0).toISOString();
    const payload = { memberId: values.memberId || undefined, startAt, durationMin: typeof values.durationMin === "number" ? values.durationMin : 60, kind: values.kind, note: values.note.trim() || undefined };
    if (editing) { updateMutation.mutate({ id: editing.id, dto: payload }); }
    else { createMutation.mutate(payload); }
    setSelectedDate(toDateKey(values.date));
  };

  const memberOptions = membersQuery.data?.map((m) => ({ value: m.id, label: m.name })) ?? [];

  const todayCount = byDate.get(today)?.length ?? 0;
  const monthCount = appointmentsQuery.data?.length ?? 0;
  const scheduledInMonth = appointmentsQuery.data?.filter((a) => a.status === "SCHEDULED").length ?? 0;

  return (
    <Stack gap="lg">
      {/* ── 히어로 카드 ── */}
      <Card
        className="app-hero-card"
        padding="xl"
        radius="xl"
        style={{ overflow: "hidden", position: "relative" }}
      >
        <Box style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <Box style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}>
              <IconCalendarEvent size={28} />
            </Box>
            <Stack gap={2}>
              <Title order={2}>대시보드</Title>
              <Text className="app-hero-sub" size="sm">
                {dayjs().format("YYYY년 M월 D일 (ddd)")}
              </Text>
            </Stack>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={() => openCreate(selectedDate)} variant="white" color="teal.7" radius="xl">
            일정 추가
          </Button>
        </Group>

        {/* 요약 스탯 4개 */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="lg" spacing="md">
          {[
            { label: "오늘 일정", value: todayCount, color: "#fff", sub: "건", icon: "📅" },
            { label: "이번 달", value: monthCount, color: "#fff", sub: "건", icon: "📆" },
            { label: "예정", value: scheduledInMonth, color: "#fff", sub: "건", icon: "⏰" },
            { label: "활성 회원", value: memberStats.active, color: "#fff", sub: "명", icon: "💪" },
          ].map(({ label, value, sub, icon }) => (
            <Box
              key={label}
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 14,
                padding: "12px 16px",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Text size="lg" mb={2}>{icon}</Text>
              <Group gap={4} align="baseline">
                <Text fw={800} size="xl" c="white">{value}</Text>
                <Text size="xs" c="rgba(255,255,255,0.75)">{sub}</Text>
              </Group>
              <Text size="xs" c="rgba(255,255,255,0.8)">{label}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Card>

      {/* ── 캘린더 + 오늘 일정 ── */}
      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" radius="xl">
            <Calendar
              date={viewMonth}
              onDateChange={(d) => setViewMonth(d)}
              static={false}
              size="md"
              getDayProps={(date) => ({
                selected: date === selectedDate,
                onClick: () => setSelectedDate(date),
              })}
              renderDay={(date) => {
                const day = dayjs(date).date();
                const count = byDate.get(date)?.length ?? 0;
                return (
                  <Indicator size={6} color="teal" offset={-4} disabled={count === 0}>
                    <div>{day}</div>
                  </Indicator>
                );
              }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" radius="xl" style={{ height: "100%" }}>
            <Stack>
              <Group justify="space-between" align="center">
                <Stack gap={0}>
                  <Text fw={700} size="md">{dayjs(selectedDate).format("M월 D일 (ddd)")}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedAppointments.length > 0 ? `일정 ${selectedAppointments.length}건` : "일정 없음"}
                  </Text>
                </Stack>
                <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => openCreate(selectedDate)} radius="xl">
                  추가
                </Button>
              </Group>

              {appointmentsQuery.isLoading ? (
                <Loader size="sm" />
              ) : selectedAppointments.length === 0 ? (
                <Box style={{ textAlign: "center", padding: "24px 0" }}>
                  <Text size="xl" mb="xs">📭</Text>
                  <Text c="dimmed" size="sm">선택한 날짜에 일정이 없습니다.</Text>
                  <Button size="xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => openCreate(selectedDate)} mt="sm" radius="xl">
                    일정 추가
                  </Button>
                </Box>
              ) : (
                <Stack gap="xs">
                  {selectedAppointments.map((a) => {
                    const meta = STATUS_META[a.status];
                    const endAt = dayjs(a.startAt).add(a.durationMin, "minute");
                    return (
                      <Card
                        key={a.id}
                        withBorder
                        padding="md"
                        radius="xl"
                        style={{ cursor: "pointer" }}
                        onClick={() => openEdit(a)}
                      >
                        <Group justify="space-between" wrap="nowrap" align="flex-start">
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" wrap="wrap">
                              <IconClock size={13} color="#64748b" />
                              <Text size="sm" fw={600}>
                                {dayjs(a.startAt).format("HH:mm")} – {endAt.format("HH:mm")}
                              </Text>
                              <Badge size="xs" variant="light" color={a.kind === "SESSION" ? "blue" : "grape"}>
                                {KIND_LABEL[a.kind]}
                              </Badge>
                              <Badge size="xs" variant="light" color={meta.color}>
                                {meta.label}
                              </Badge>
                            </Group>
                            <Group gap={6} wrap="nowrap">
                              {a.member ? (
                                <Anchor
                                  component={Link}
                                  to={`/members/${a.member.id}`}
                                  size="sm"
                                  fw={500}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {a.member.name}
                                </Anchor>
                              ) : (
                                <Group gap={4}><IconUser size={13} /><Text size="sm" c="dimmed">미지정</Text></Group>
                              )}
                            </Group>
                            {a.note && <Text size="xs" c="dimmed" lineClamp={1}>{a.note}</Text>}
                          </Stack>
                          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            {a.member && (
                              <Tooltip label="진행 현황" withArrow>
                                <ActionIcon size="sm" variant="subtle" color="teal" onClick={(e) => { e.stopPropagation(); showHistory(a.member!.id); }}>
                                  <IconChartBar size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            {a.member && a.status === "SCHEDULED" && (
                              <Tooltip label="세션 기록" withArrow>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="blue"
                                  component={Link}
                                  to={`/members/${a.member.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconNotebook size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            {a.status === "SCHEDULED" && (
                              <>
                                <Button size="compact-xs" variant="light" color="teal" onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: a.id, dto: { status: "COMPLETED" } }); }}>
                                  완료
                                </Button>
                                <Button size="compact-xs" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: a.id, dto: { status: "CANCELED" } }); }}>
                                  취소
                                </Button>
                              </>
                            )}
                            <ActionIcon size="sm" variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); if (confirm("이 일정을 삭제할까요?")) deleteMutation.mutate(a.id); }}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
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

      {/* ── 회원 현황 + 최근 세션 ── */}
      <Grid gap="md">
        {/* 회원 현황 */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="xl" padding="lg" style={{ height: "100%" }}>
            <Group gap={8} mb="lg">
              <Box style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0d9488,#0891b2)", display: "grid", placeItems: "center" }}>
                <IconUsers size={17} color="white" />
              </Box>
              <Title order={4}>회원 현황</Title>
              <Badge variant="light" color="teal" size="sm">총 {memberStats.total}명</Badge>
            </Group>

            {membersQuery.isLoading ? (
              <Loader size="sm" />
            ) : (
              <Stack gap="md">
                <Group justify="center">
                  <RingProgress
                    size={160}
                    thickness={20}
                    roundCaps
                    sections={[
                      { value: memberStats.total > 0 ? (memberStats.active / memberStats.total) * 100 : 0, color: "teal" },
                      { value: memberStats.total > 0 ? (memberStats.consultation / memberStats.total) * 100 : 0, color: "yellow" },
                      { value: memberStats.total > 0 ? (memberStats.dormant / memberStats.total) * 100 : 0, color: "gray" },
                    ]}
                    label={
                      <Stack gap={0} align="center">
                        <Text fw={800} size="xl" c="teal.7">{memberStats.total}</Text>
                        <Text size="xs" c="dimmed">전체</Text>
                      </Stack>
                    }
                  />
                </Group>

                <SimpleGrid cols={3} spacing="xs">
                  {[
                    { label: "활성", value: memberStats.active, color: "teal", emoji: "🟢" },
                    { label: "상담", value: memberStats.consultation, color: "yellow", emoji: "🟡" },
                    { label: "휴면", value: memberStats.dormant, color: "gray", emoji: "⚪" },
                  ].map(({ label, value, color, emoji }) => (
                    <Box
                      key={label}
                      style={{
                        borderRadius: 14,
                        padding: "12px 8px",
                        textAlign: "center",
                        background: `var(--mantine-color-${color}-0, rgba(0,0,0,0.03))`,
                        border: `1px solid var(--mantine-color-${color}-2, #e2e8f0)`,
                      }}
                    >
                      <Text size="md" mb={2}>{emoji}</Text>
                      <Text fw={800} size="xl" c={`${color}.7`}>{value}</Text>
                      <Text size="xs" c="dimmed">{label}</Text>
                    </Box>
                  ))}
                </SimpleGrid>

                <Button
                  component={Link}
                  to="/members"
                  variant="light"
                  color="teal"
                  fullWidth
                  radius="xl"
                  size="sm"
                  leftSection={<IconUsers size={14} />}
                >
                  회원 목록 보기
                </Button>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* 최근 세션 기록 */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="xl" padding="lg" style={{ height: "100%" }}>
            <Group gap={8} mb="md">
              <Box style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "grid", placeItems: "center" }}>
                <IconHistory size={17} color="white" />
              </Box>
              <Title order={4}>최근 세션 기록</Title>
            </Group>

            {recentSessionsQuery.isLoading ? (
              <Loader size="sm" />
            ) : (recentSessionsQuery.data?.length ?? 0) === 0 ? (
              <Box style={{ textAlign: "center", padding: "24px 0" }}>
                <Text size="xl" mb={4}>📋</Text>
                <Text size="sm" c="dimmed">기록된 세션이 없습니다.</Text>
              </Box>
            ) : (
              <Stack gap="xs">
                {recentSessionsQuery.data?.map((s) => {
                  const sessionMember = (s as { member?: { id: string; name: string } }).member;
                  const perf = s.performance ? PERF_META[s.performance] : null;
                  const exCount = Array.isArray(s.exerciseEntries) ? s.exerciseEntries.length : 0;
                  return (
                    <Box
                      key={s.id}
                      component={Link}
                      to={`/sessions/${s.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Box
                        style={{
                          borderRadius: 14,
                          padding: "10px 14px",
                          border: "1px solid rgba(226,232,240,0.8)",
                          background: "rgba(248,250,252,0.6)",
                          transition: "all 120ms ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(124,58,237,0.05)";
                          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.2)";
                          (e.currentTarget as HTMLDivElement).style.transform = "translateX(2px)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(248,250,252,0.6)";
                          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(226,232,240,0.8)";
                          (e.currentTarget as HTMLDivElement).style.transform = "none";
                        }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap">
                            <Avatar size={36} radius="xl" color={sessionMember ? avatarColor(sessionMember.name) : "gray"} variant="light">
                              {sessionMember ? initials(sessionMember.name) : "?"}
                            </Avatar>
                            <Stack gap={1}>
                              <Group gap="xs">
                                <Text size="sm" fw={700} c="dark">{sessionMember?.name ?? "-"}</Text>
                                <Badge size="xs" variant="light" color="violet" radius="sm">
                                  Day {s.dayNumber}
                                </Badge>
                              </Group>
                              <Group gap={6}>
                                <Text size="xs" c="dimmed">{dayjs(s.date).format("M/D (ddd)")}</Text>
                                <Text size="xs" c="dimmed">·</Text>
                                <Text size="xs" c="dimmed">{exCount}종목</Text>
                              </Group>
                            </Stack>
                          </Group>
                          <Group gap="xs" wrap="nowrap">
                            {perf && (
                              <Badge size="sm" variant="light" color={perf.color} radius="sm">
                                {perf.label}
                              </Badge>
                            )}
                            {s.note && (
                              <Text size="xs" c="dimmed" lineClamp={1} maw={120} visibleFrom="sm">
                                {s.note}
                              </Text>
                            )}
                          </Group>
                        </Group>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {/* ── 수강권 소진 임박 ── */}
      <Card withBorder radius="xl" padding="lg">
        <Group gap={8} mb="md">
          <Box style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "grid", placeItems: "center" }}>
            <IconAlertTriangle size={17} color="white" />
          </Box>
          <Title order={4}>수강권 소진 임박</Title>
          {nearlyDoneEnrollments.length > 0 && (
            <Badge color="orange" variant="filled" size="sm">{nearlyDoneEnrollments.length}건</Badge>
          )}
        </Group>

        {enrollmentsQuery.isLoading ? (
          <Loader size="sm" />
        ) : nearlyDoneEnrollments.length === 0 ? (
          <Box style={{ textAlign: "center", padding: "20px 0" }}>
            <Text size="xl" mb={4}>✅</Text>
            <Text size="sm" c="dimmed">소진 임박 수강권이 없습니다.</Text>
          </Box>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {nearlyDoneEnrollments.map((e) => {
              const remaining = e.totalSessions - (e.usedSessions ?? 0);
              const percent = Math.min(100, ((e.usedSessions ?? 0) / e.totalSessions) * 100);
              const urgentColor = remaining === 0 ? "red" : remaining === 1 ? "orange" : "yellow";
              return (
                <Box
                  key={e.id}
                  component={Link}
                  to={e.member ? `/members/${e.member.id}` : "#"}
                  style={{ textDecoration: "none" }}
                >
                  <Card
                    withBorder
                    radius="xl"
                    padding="md"
                    style={{
                      borderColor: remaining === 0 ? "#fca5a5" : remaining === 1 ? "#fed7aa" : "#fef08a",
                      background: remaining === 0 ? "rgba(220,38,38,0.04)" : remaining === 1 ? "rgba(249,115,22,0.04)" : "rgba(234,179,8,0.04)",
                      cursor: "pointer",
                      transition: "transform 120ms ease",
                    }}
                    onMouseEnter={(ev) => ((ev.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)")}
                    onMouseLeave={(ev) => ((ev.currentTarget as HTMLDivElement).style.transform = "none")}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Avatar size={32} radius="xl" color={e.member ? avatarColor(e.member.name) : "gray"} variant="light">
                          {e.member ? initials(e.member.name) : "?"}
                        </Avatar>
                        <Stack gap={0}>
                          <Text size="sm" fw={700}>{e.member?.name ?? "알 수 없음"}</Text>
                          <Text size="xs" c="dimmed">{e.totalSessions}회권</Text>
                        </Stack>
                      </Group>
                      <Badge color={urgentColor} variant="filled" size="sm" radius="xl">
                        잔여 {remaining}회
                      </Badge>
                    </Group>
                    <Progress value={percent} size="sm" radius="xl" color={urgentColor} />
                    <Text size="xs" c="dimmed" mt={4} ta="right">
                      {e.usedSessions ?? 0} / {e.totalSessions}회 완료
                    </Text>
                  </Card>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Card>

      <MemberHistoryModal memberId={historyMemberId} opened={historyOpened} onClose={closeHistory} />

      {/* 일정 추가/수정 모달 */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700} size="lg">{editing ? "일정 수정" : "일정 추가"}</Text>}
        centered
        size="md"
        radius="xl"
        padding="xl"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <SegmentedControl
              fullWidth
              size="sm"
              data={[
                { value: "SESSION", label: "PT 세션" },
                { value: "CONSULTATION", label: "상담" },
              ]}
              {...form.getInputProps("kind")}
            />
            <Select
              label="회원"
              placeholder="선택 (신규 상담은 비워두기 가능)"
              searchable
              clearable
              data={memberOptions}
              radius="lg"
              size="sm"
              {...form.getInputProps("memberId")}
            />
            <Group grow gap="sm">
              <DatePickerInput label="날짜" valueFormat="YYYY-MM-DD" required radius="lg" size="sm" {...form.getInputProps("date")} />
              <TimePicker
                label="시작 시간"
                required
                format="24h"
                withDropdown
                minutesStep={5}
                hoursStep={1}
                radius="lg"
                size="sm"
                presets={["06:00","07:00","09:00","10:00","12:00","14:00","15:00","18:00","19:00","20:00","21:00"]}
                {...form.getInputProps("time")}
              />
            </Group>
            <NumberInput label="소요 시간 (분)" min={10} max={600} step={15} radius="lg" size="sm" {...form.getInputProps("durationMin")} />
            <Textarea label="메모" placeholder="특이사항, 준비물, 목표 등" autosize minRows={3} radius="lg" size="sm" {...form.getInputProps("note")} />
            <Group justify="space-between" mt="xs">
              {editing ? (
                <Button variant="subtle" color="red" leftSection={<IconTrash size={14} />} radius="xl" onClick={() => { if (confirm("이 일정을 삭제할까요?")) { deleteMutation.mutate(editing.id); close(); } }}>
                  삭제
                </Button>
              ) : <span />}
              <Group gap="xs">
                <Button variant="subtle" onClick={close} radius="xl">취소</Button>
                <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} radius="xl" variant="gradient" gradient={{ from: "teal.6", to: "cyan.5", deg: 135 }} px="xl">
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
