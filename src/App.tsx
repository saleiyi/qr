/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBrowserRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom';
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

function InspectionRoute() {
  const location=useLocation();
  return <InspectionFormPage key={location.pathname+location.search} />;
}

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
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
]);

export default function App() {
  return (
    <AppStateProvider>
      <RouterProvider router={router} />
      <ToastContainer />
    </AppStateProvider>
  );
}
