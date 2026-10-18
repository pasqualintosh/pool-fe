import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import JoinPage from './pages/JoinPage';
import VotingPage from './pages/VotingPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <header className="app-header">
        <a href="/">{import.meta.env.VITE_APP_NAME ?? 'CFP Voting'}</a>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:sessionId" element={<JoinPage />} />
          <Route path="/session/:sessionId" element={<VotingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
