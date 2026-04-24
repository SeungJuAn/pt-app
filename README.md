# PT App Web

퍼스널 트레이너용 회원 · 등록권 · 세션 · 일정 관리 React 애플리케이션.

- **Stack**: React 19, TypeScript, Vite 8, Mantine v9, TanStack Query v5, React Router v7
- **Backend**: 별도 NestJS 서버(`pt-app`) 필요. 로컬 개발은 `VITE_API_URL`로 연결.
- **Demo**: GitHub Pages에 MSW 목업 서버 포함하여 배포됨. 새로고침 시 시드 데이터로 초기화.

## 라이브 데모
https://seungjuan.github.io/pt-app/

## 주요 기능
- 대시보드 캘린더 + 일정 CRUD (상담/PT세션 구분, 상태 관리)
- 회원 관리 — 상세 프로필(성별·나이·직장·PT 경험·메모), 검색, 페이지네이션(5/10/15/20), 레벨 필터(활성/상담/휴면)
- 회원별 진행 현황 모달 (등록권 진행률 + 세션 이력)
- 등록권 관리 + 상태 전이(ACTIVE → COMPLETED/CANCELED)

## 로컬 개발
```bash
npm install
cp .env.example .env   # VITE_API_URL을 백엔드 서버 URL로 조정
npm run dev
```

### 데모 모드 (백엔드 없이 실행)
```bash
VITE_DEMO=true npm run dev
```

## 프로덕션 빌드
```bash
npm run build    # dist/ 생성, base path = /pt-app/
```

## 배포
`main` 브랜치로 push하면 GitHub Actions가 자동으로 GitHub Pages에 배포합니다.
(워크플로: [.github/workflows/deploy.yml](.github/workflows/deploy.yml))
