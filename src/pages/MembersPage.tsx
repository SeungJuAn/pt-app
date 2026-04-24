import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Pagination,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { Link } from 'react-router';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconUserOff,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../api/members';
import { formatPhone } from '../lib/phone';
import type {
  CreateMemberDto,
  Member,
  MemberGender,
  MemberLevel,
} from '../types';

const LEVEL_META: Record<
  MemberLevel,
  { label: string; color: string; hint: string }
> = {
  CONSULTATION: {
    label: '상담',
    color: 'yellow',
    hint: '등록권 없음 · 상담 단계',
  },
  ACTIVE: {
    label: '활성',
    color: 'teal',
    hint: '진행 중인 등록권 있음',
  },
  DORMANT: {
    label: '휴면',
    color: 'gray',
    hint: '등록권 전부 완료/취소',
  },
};

type LevelFilter = 'ALL' | MemberLevel;

interface MemberFormValues {
  name: string;
  gender: MemberGender | '';
  age: number | '';
  occupation: string;
  ptExperience: string;
  phone: string;
  memo: string;
}

const GENDER_LABEL: Record<MemberGender, string> = {
  MALE: '남',
  FEMALE: '여',
};

const AVATAR_COLORS = [
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'grape',
  'pink',
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
] as const;

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  const t = name.trim();
  if (!t) return '?';
  // Korean name: show last 2 chars (이름); English: first-letters
  if (/[가-힣]/.test(t)) return t.length > 2 ? t.slice(-2) : t;
  return t
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const PAGE_SIZE_OPTIONS = ['5', '10', '15', '20'];

export function MembersPage() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchInput, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, levelFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'members',
      { q: debouncedSearch, page, pageSize, level: levelFilter },
    ],
    queryFn: () =>
      membersApi.list({
        q: debouncedSearch || undefined,
        page,
        pageSize,
        level: levelFilter === 'ALL' ? undefined : levelFilter,
      }),
    placeholderData: (prev) => prev,
  });

  const members = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createMutation = useMutation({
    mutationFn: (dto: CreateMemberDto) => membersApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      notifications.show({ message: '회원이 추가되었습니다.', color: 'teal' });
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

  const removeMutation = useMutation({
    mutationFn: (id: string) => membersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      notifications.show({ message: '삭제되었습니다.', color: 'teal' });
    },
  });

  const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;

  const form = useForm<MemberFormValues>({
    initialValues: {
      name: '',
      gender: '',
      age: '',
      occupation: '',
      ptExperience: '',
      phone: '',
      memo: '',
    },
    validate: {
      name: (v) => (v.trim().length ? null : '이름을 입력하세요'),
      age: (v) => {
        if (v === '' || v === null) return null;
        return v >= 1 && v <= 120 ? null : '1~120 사이의 값을 입력하세요';
      },
      phone: (v) => {
        const s = (v ?? '').trim();
        if (!s) return null;
        return PHONE_REGEX.test(s)
          ? null
          : '올바른 휴대폰 번호가 아닙니다 (예: 010-1234-5678)';
      },
    },
  });

  const handleSubmit = (values: MemberFormValues) => {
    const dto: CreateMemberDto = {
      name: values.name.trim(),
      gender: values.gender || undefined,
      age: values.age === '' ? undefined : values.age,
      occupation: values.occupation.trim() || undefined,
      ptExperience: values.ptExperience.trim() || undefined,
      phone: values.phone.trim() || undefined,
      memo: values.memo.trim() || undefined,
    };
    createMutation.mutate(dto);
  };

  const showEmpty = !isLoading && members.length === 0;

  const rangeLabel = useMemo(() => {
    if (total === 0) return '';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return `${start}–${end} / ${total}`;
  }, [page, pageSize, total]);

  const rows = members.map((m: Member) => {
    const lvl = m.level ?? 'CONSULTATION';
    const meta = LEVEL_META[lvl];
    return (
      <Table.Tr key={m.id}>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <Avatar
              color={avatarColor(m.name)}
              radius="xl"
              size={36}
              variant="light"
            >
              {initials(m.name)}
            </Avatar>
            <Stack gap={0}>
              <Group gap={6}>
                <Anchor
                  component={Link}
                  to={`/members/${m.id}`}
                  fw={600}
                  size="sm"
                >
                  {m.name}
                </Anchor>
                <Tooltip label={meta.hint} withArrow openDelay={300}>
                  <Badge size="xs" variant="light" color={meta.color}>
                    {meta.label}
                  </Badge>
                </Tooltip>
              </Group>
              {m.ptExperience && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {m.ptExperience}
                </Text>
              )}
            </Stack>
          </Group>
        </Table.Td>
        <Table.Td>
          {m.gender ? (
            <Badge
              size="sm"
              variant="light"
              color={m.gender === 'MALE' ? 'blue' : 'pink'}
            >
              {GENDER_LABEL[m.gender]}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              -
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm">{m.age ?? '-'}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{m.occupation ?? '-'}</Text>
        </Table.Td>
        <Table.Td>
          <Tooltip
            label={`활성 ${m.activeEnrollmentCount ?? 0}개 / 전체 ${
              m.enrollmentCount ?? 0
            }개`}
            withArrow
            openDelay={300}
          >
            <Text size="sm">
              {m.activeEnrollmentCount ?? 0} / {m.enrollmentCount ?? 0}
            </Text>
          </Tooltip>
        </Table.Td>
        <Table.Td>
          <Text size="sm" ff="monospace">
            {m.phone ?? '-'}
          </Text>
        </Table.Td>
        <Table.Td>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() => {
              if (confirm(`${m.name} 회원을 삭제할까요?`)) {
                removeMutation.mutate(m.id);
              }
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack>
      <Card className="app-hero-card" padding="lg" radius="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="md">
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
              <IconUsers size={26} />
            </Box>
            <Stack gap={0}>
              <Title order={2}>회원</Title>
              <Text className="app-hero-sub" size="sm">
                등록된 회원 전체 {total}명
              </Text>
            </Stack>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={open}
            color="white"
            variant="white"
            c="teal.7"
          >
            회원 추가
          </Button>
        </Group>
      </Card>

      <Paper p="md" radius="lg" shadow="sm">
        <Stack gap="sm" mb="sm">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <SegmentedControl
              value={levelFilter}
              onChange={(v) => setLevelFilter(v as LevelFilter)}
              data={[
                { value: 'ALL', label: '전체' },
                { value: 'ACTIVE', label: '🟢 활성' },
                { value: 'CONSULTATION', label: '🟡 상담' },
                { value: 'DORMANT', label: '⚪ 휴면' },
              ]}
            />
            <Group gap="sm">
              <Text size="sm" c="dimmed">
                {isFetching ? '불러오는 중…' : rangeLabel}
              </Text>
              <Select
                aria-label="페이지당 회원 수"
                value={String(pageSize)}
                onChange={(v) => v && setPageSize(Number(v))}
                data={PAGE_SIZE_OPTIONS.map((v) => ({
                  value: v,
                  label: `${v}개씩`,
                }))}
                w={110}
              />
            </Group>
          </Group>
          <TextInput
            placeholder="이름 · 연락처 · 직장 · 메모 검색"
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchInput ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setSearchInput('')}
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
          />
        </Stack>

        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : showEmpty ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconUserOff size={40} stroke={1.5} color="#94a3b8" />
              <Text c="dimmed" size="sm">
                {debouncedSearch
                  ? '검색 결과가 없습니다.'
                  : '등록된 회원이 없습니다.'}
              </Text>
              {!debouncedSearch && (
                <Button
                  leftSection={<IconPlus size={14} />}
                  size="xs"
                  variant="light"
                  onClick={open}
                >
                  첫 회원 추가
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <>
            <Table highlightOnHover striped stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>이름 · 레벨</Table.Th>
                  <Table.Th w={80}>성별</Table.Th>
                  <Table.Th w={70}>나이</Table.Th>
                  <Table.Th>직장</Table.Th>
                  <Table.Th w={100}>등록권</Table.Th>
                  <Table.Th>연락처</Table.Th>
                  <Table.Th w={60}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  total={totalPages}
                  value={page}
                  onChange={setPage}
                  withEdges
                  size="sm"
                />
              </Group>
            )}
          </>
        )}
      </Paper>

      <Modal opened={opened} onClose={close} title="회원 추가" centered size="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="이름"
              required
              {...form.getInputProps('name')}
            />
            <Group grow>
              <Select
                label="성별"
                placeholder="선택"
                clearable
                data={[
                  { value: 'MALE', label: '남' },
                  { value: 'FEMALE', label: '여' },
                ]}
                {...form.getInputProps('gender')}
              />
              <NumberInput
                label="나이"
                min={1}
                max={120}
                {...form.getInputProps('age')}
              />
            </Group>
            <TextInput
              label="직장"
              placeholder="예: 회사원, 학생, 자영업"
              {...form.getInputProps('occupation')}
            />
            <Textarea
              label="운동(PT) 경험"
              placeholder="예: PT 경험 없음 / 헬스 6개월 / 요가 1년"
              autosize
              minRows={2}
              {...form.getInputProps('ptExperience')}
            />
            <TextInput
              label="연락처"
              placeholder="010-0000-0000"
              inputMode="numeric"
              maxLength={13}
              {...form.getInputProps('phone')}
              onChange={(e) =>
                form.setFieldValue(
                  'phone',
                  formatPhone(e.currentTarget.value),
                )
              }
            />
            <Textarea
              label="기타 사항"
              placeholder="목표, 부상 이력, 식단 제한 등"
              autosize
              minRows={2}
              {...form.getInputProps('memo')}
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
