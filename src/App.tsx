import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Home = lazy(() => import('@/pages/Home'));
const Join = lazy(() => import('@/pages/Join'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// ── Spinner fallback ──────────────────────────────────────────────────────────
function FullPageSpinner() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

// ── Protected route ───────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />

        {/* Protected routes */}
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:roomId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
