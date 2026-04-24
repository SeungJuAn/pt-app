import {
  AppShell,
  Badge,
  Box,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBarbell,
  IconBolt,
  IconDashboard,
  IconUsers,
} from '@tabler/icons-react';
import { NavLink as RouterLink, Outlet, useLocation } from 'react-router';

const navItems = [
  { to: '/', label: '대시보드', icon: IconDashboard, desc: '일정 · 오늘 할 일' },
  { to: '/members', label: '회원', icon: IconUsers, desc: '회원 관리 · 등록권' },
  { to: '/exercises', label: '운동 관리', icon: IconBarbell, desc: '운동 라이브러리' },
];

export function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure(false);
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        style={{
          background:
            'linear-gradient(135deg, rgba(13,148,136,0.97) 0%, rgba(8,145,178,0.97) 100%)',
          borderBottom: 'none',
          backdropFilter: 'saturate(140%)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="white"
            />
            <Group gap={8}>
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <IconBolt size={18} color="white" />
              </Box>
              <Stack gap={0}>
                <Title order={4} c="white" style={{ letterSpacing: '-0.01em' }}>
                  PT App
                </Title>
                <Text size="xs" c="rgba(255,255,255,0.75)" mt={-4}>
                  퍼스널 트레이너 워크스페이스
                </Text>
              </Stack>
            </Group>
          </Group>
          <Badge
            variant="white"
            color="teal"
            size="sm"
            leftSection={<IconBolt size={10} />}
            visibleFrom="sm"
          >
            Beta
          </Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ background: '#fafbfc' }}>
        <Stack gap={4}>
          {navItems.map((item) => {
            const active =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                component={RouterLink}
                to={item.to}
                label={
                  <Text fw={active ? 600 : 500} size="sm">
                    {item.label}
                  </Text>
                }
                description={item.desc}
                leftSection={
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      display: 'grid',
                      placeItems: 'center',
                      background: active
                        ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                        : 'rgba(15,23,42,0.04)',
                      color: active ? 'white' : '#475569',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <item.icon size={18} />
                  </Box>
                }
                active={active}
                variant="light"
                style={{
                  borderRadius: 10,
                }}
              />
            );
          })}
        </Stack>

        <Box
          mt="auto"
          p="sm"
          style={{
            borderRadius: 12,
            background:
              'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(14,165,233,0.08))',
            border: '1px solid rgba(20,184,166,0.15)',
          }}
        >
          <Text size="xs" fw={600} c="teal.7">
            💡 Tip
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            일정 카드의 그래프 아이콘을 누르면 해당 회원의 진행 현황을 확인할 수
            있어요.
          </Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
