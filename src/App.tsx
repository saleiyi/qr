/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { AppStateProvider } from './context/AppStateContext';
import { ToastContainer } from './components/ToastContainer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { MobileScanPage } from './pages/MobileScanPage';
import { InspectionFormPage } from './pages/InspectionFormPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { RepairRequestForm } from './components/RepairRequestForm';
import { RecordsPage } from './pages/RecordsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlansPage } from './pages/PlansPage';
import { PilotProvider, useOptionalPilot } from './context/PilotContext';
import { LoginPage, AuthFrame } from './pages/LoginPage';
import { ActivatePage } from './pages/ActivatePage';
import { demoHref } from './services/runtimeMode';

const demoRouter = /^\/demo(?:\/|$)/.test(window.location.pathname);
const localDemo = Boolean(import.meta.env.DEV);

function LiveWorkspace() {
  const pilot = useOptionalPilot()!;
  const location = useLocation();
  if (pilot.status === 'unauthenticated')
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (!pilot.data)
    return (
      <AuthFrame
        title="Seu ambiente de trabalho."
        description="Conectando aos equipamentos e registros da sua empresa."
      >
        {pilot.status === 'loading' ? (
          <p className="flex items-center gap-2 text-sm text-[#526980]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando sua empresa…
          </p>
        ) : (
          <>
            <p role="alert" className="text-sm leading-relaxed text-[#9C2A20]">
              {pilot.error}
            </p>
            <button
              type="button"
              className="mt-5 rounded-lg bg-[#176B5B] px-5 py-3 text-sm font-semibold text-white"
              onClick={() => void pilot.refresh()}
            >
              Tentar novamente
            </button>
            <a href={demoHref()} className="mt-5 block text-sm text-[#176B5B] underline">
              Abrir demonstração
            </a>
          </>
        )}
      </AuthFrame>
    );
  return (
    <AppStateProvider key={`${pilot.data.identity.workspaceId}:${pilot.data.identity.userId}`}>
      <Outlet />
      <ToastContainer />
    </AppStateProvider>
  );
}

function WorkspaceLayout() {
  const location = useLocation();
  const protectedPath =
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/') ||
    location.pathname.startsWith('/a/');
  if (!demoRouter && !localDemo && protectedPath)
    return (
      <PilotProvider>
        <LiveWorkspace />
      </PilotProvider>
    );
  return (
    <AppStateProvider>
      <Outlet />
      <ToastContainer />
    </AppStateProvider>
  );
}

function InspectionRoute() {
  const location = useLocation();
  return <InspectionFormPage key={location.pathname + location.search} />;
}

const router = createBrowserRouter(
  [
    {
      element: <WorkspaceLayout />,
      children: [
        { path: '/', element: <LandingPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/activate', element: <ActivatePage /> },
        { path: '/app', element: <DashboardPage /> },
        { path: '/app/assets', element: <AssetsPage /> },
        { path: '/app/assets/:id', element: <AssetDetailPage /> },
        { path: '/app/issues', element: <WorkOrdersPage /> },
        { path: '/app/plans', element: <PlansPage /> },
        { path: '/app/records', element: <RecordsPage /> },
        { path: '/app/templates', element: <TemplatesPage /> },
        { path: '/app/settings', element: <SettingsPage /> },
        { path: '/a/:id', element: <MobileScanPage /> },
        { path: '/a/:id/request', element: <RepairRequestForm /> },
        { path: '/a/:id/inspect', element: <InspectionRoute /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: demoRouter ? '/demo' : undefined },
);

export default function App() {
  return <RouterProvider router={router} />;
}
