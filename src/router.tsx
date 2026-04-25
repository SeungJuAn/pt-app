import { createBrowserRouter } from 'react-router';
import { AppShellLayout } from './components/AppShellLayout';
import { HomePage } from './pages/HomePage';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { SessionCreatePage } from './pages/SessionCreatePage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { ExercisesPlaceholder } from './pages/ExercisesPlaceholder';

const baseUrl = import.meta.env.BASE_URL ?? '/';
const basename = baseUrl.replace(/\/$/, '') || undefined;

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: AppShellLayout,
      children: [
        { index: true, Component: HomePage },
        { path: 'members', Component: MembersPage },
        { path: 'members/:id', Component: MemberDetailPage },
        {
          path: 'enrollments/:enrollmentId/sessions/new',
          Component: SessionCreatePage,
        },
        { path: 'sessions/:sessionId/edit', Component: SessionCreatePage },
        { path: 'sessions/:id', Component: SessionDetailPage },
        { path: 'exercises', Component: ExercisesPlaceholder },
      ],
    },
  ],
  { basename },
);
