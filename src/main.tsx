import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

async function enableMocking() {
  if (!import.meta.env.VITE_DEMO) return;
  const { worker } = await import('./mocks/browser');
  const swUrl = `${import.meta.env.BASE_URL}mockServiceWorker.js`;
  await worker.start({
    serviceWorker: { url: swUrl },
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
