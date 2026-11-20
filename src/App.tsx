/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStateProvider } from './context/AppStateContext';
import { ToastContainer } from './components/ToastContainer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsPage } from './pages/AssetsPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { MobileScanPage } from './pages/MobileScanPage';
import { InspectionFormPage } from './pages/InspectionFormPage';
import { IssuesPage } from './pages/IssuesPage';
import { RecordsPage } from './pages/RecordsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/assets" element={<AssetsPage />} />
          <Route path="/app/assets/:id" element={<AssetDetailPage />} />
          <Route path="/app/issues" element={<IssuesPage />} />
          <Route path="/app/records" element={<RecordsPage />} />
          <Route path="/app/templates" element={<TemplatesPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/a/:id" element={<MobileScanPage />} />
          <Route path="/a/:id/inspect" element={<InspectionFormPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppStateProvider>
  );
}
