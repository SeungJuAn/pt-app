import {
  AppShell,
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
  IconLayoutDashboard,
  IconUsers,
} from '@tabler/icons-react';
import { NavLink as RouterLink, Outlet, useLocation } from 'react-router';

const navItems = [
  { to: '/', label: '대시보드', icon: IconLayoutDashboard, desc: '일정 · 오늘 할 일' },
  { to: '/members', label: '회원 관리', icon: IconUsers, desc: '회원 · 등록권 · 세션' },
  { to: '/exercises', label: '운동 관리', icon: IconBarbell, desc: '운동 라이브러리' },
];

export function AppShellLayout() {
  const [opened, { toggle }] = useDisclosure(false);
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      styles={{
        main: {
          background: '#f4f4f5',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header
        style={{
          background: '#18181b',
          border: 'none',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
            <Group gap={10}>
              <Box
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid', placeItems: 'center',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <IconBolt size={18} color="white" fill="white" />
              </Box>
              <Stack gap={0}>
                <Title order={4} c="white" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  PT App
                </Title>
                <Text size="xs" c="rgba(255,255,255,0.7)" style={{ lineHeight: 1 }}>
                  트레이너 워크스페이스
                </Text>
              </Stack>
            </Group>
          </Group>

          <Box
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: '3px 10px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Text size="xs" c="white" fw={600}>Beta</Text>
          </Box>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="sm"
        style={{
          background: 'white',
          borderRight: '1px solid rgba(226,232,240,0.8)',
        }}
      >
        <Stack gap={3}>
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
                  <Text fw={active ? 700 : 500} size="sm" c={active ? 'dark.9' : 'dark'}>
                    {item.label}
                  </Text>
                }
                description={
                  <Text size="xs" c="dimmed">{item.desc}</Text>
                }
                leftSection={
                  <Box
                    style={{
                      width: 34, height: 34, borderRadius: 10,
                      display: 'grid', placeItems: 'center',
                      background: active
                        ? '#18181b'
                        : 'rgba(15,23,42,0.04)',
                      color: active ? 'white' : '#64748b',
                      transition: 'all 180ms ease',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                    }}
                  >
                    <item.icon size={17} />
                  </Box>
                }
                active={active}
                variant="subtle"
                style={{
                  borderRadius: 12,
                  background: active ? 'rgba(0,0,0,0.05)' : 'transparent',
                  border: active ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
                  transition: 'all 150ms ease',
                }}
              />
            );
          })}
        </Stack>

        {/* 하단 도움말 */}
        <Box
          mt="auto"
          p="sm"
          style={{
            borderRadius: 14,
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Group gap={6} mb={4}>
            <Text size="xs" fw={700} c="dark.7">💡 사용 팁</Text>
          </Group>
          <Text size="xs" c="dimmed" lh={1.5}>
            회원 카드의 등록권에서 세션을 기록하고, 완료된 등록권은 내역을 펼쳐 볼 수 있어요.
          </Text>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
