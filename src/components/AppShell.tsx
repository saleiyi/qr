import { Modal } from './Modal';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  QrCode,
  Settings,
  Wrench,
  X,
  ExternalLink,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { formatDateBR } from '../utils/date';
import type { UserRole } from '../types/domain';
import { t } from '../i18n';
import { useOptionalPilot } from '../context/PilotContext';
import { PilotAccount, PilotSyncBar } from './PilotAccount';

interface AppShellProps {
  title: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/app', label: t.nav.overview, icon: LayoutDashboard, end: true },
  { to: '/app/plans', label: 'Planos e tarefas', icon: CalendarDays, end: false },
  { to: '/app/assets', label: t.nav.assets, icon: Wrench, end: false },
  { to: '/app/issues', label: t.nav.issues, icon: AlertTriangle, end: false },
  { to: '/app/records', label: t.nav.records, icon: FileSpreadsheet, end: false },
  { to: '/app/templates', label: t.nav.templates, icon: ClipboardCheck, end: false },
  { to: '/app/settings', label: t.nav.settings, icon: Settings, end: false },
];

export const AppShell: React.FC<AppShellProps> = ({ title, subtitle, primaryAction, children }) => {
  const { effectiveState, stats, demoSettings, setDemoRole } = useAppState();
  const pilot = useOptionalPilot();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeMobileMenu = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    closeMobileMenu();
    desktop.addEventListener('change', closeMobileMenu);
    return () => desktop.removeEventListener('change', closeMobileMenu);
  }, []);

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Menu principal do painel">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const badgeCount =
          item.to === '/app/issues'
            ? stats.unresolvedIssuesCount
            : item.to === '/app/assets'
              ? stats.overdueCount
              : 0;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[#176B5B] text-white shadow-sm'
                  : 'text-[#CBD7E4] hover:bg-[#1C3852] hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {badgeCount > 0 && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono tabular-nums text-[11px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#1E3B57] text-[#FBBF24]'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#17324D] lg:flex">
      {/* Desktop Sidebar — Deep Industrial Navy */}
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-[#1F3A54] bg-[#13293D] text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex h-16 items-center justify-between border-b border-[#23415C] px-5">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B5B] text-white">
              <QrCode className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{APP_CONFIG.brandName}</span>
          </Link>
          <span className="rounded border border-[#2B4966] bg-[#1B3650] px-2 py-0.5 text-[11px] font-medium text-[#CBD7E4]">
            {pilot ? 'Empresa' : APP_CONFIG.demoLabel}
          </span>
        </div>

        <div className="border-b border-[#23415C] px-5 py-3">
          <p className="truncate text-xs font-semibold text-white">
            {effectiveState.company.tradeName}
          </p>
          <p className="mt-0.5 text-xs text-[#9FB5CA] tabular-nums">
            Ref.: {formatDateBR(APP_CONFIG.demoClockDate)}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>

        <div className="border-t border-[#23415C] p-4">
          {pilot ? (
            <PilotAccount />
          ) : (
            <>
              <div className="rounded-lg border border-[#294968] bg-[#1A354E] p-3">
                <label
                  htmlFor="sidebar-role-select"
                  className="block text-[11px] font-semibold text-[#CBD7E4]"
                >
                  Visão simulada de perfil
                </label>
                <select
                  id="sidebar-role-select"
                  value={demoSettings.activeDemoRole}
                  onChange={(e) => setDemoRole(e.target.value as UserRole)}
                  className="mt-1.5 w-full rounded-md border border-[#345678] bg-[#102436] px-2.5 py-1.5 text-xs font-medium text-white"
                >
                  <option value="admin">Administrador (Edição total)</option>
                  <option value="operator">Operador (Inspeção em campo)</option>
                  <option value="viewer">Visualizador (Somente leitura)</option>
                </select>
                <p className="mt-1.5 text-[11px] leading-snug text-[#9FB5CA]">
                  Alterna a experiência do protótipo no navegador.
                </p>
              </div>
              <Link
                to="/a/eq-001"
                className="mt-3 flex w-full items-center justify-between rounded-lg border border-[#294968] bg-[#1A354E] px-3 py-2 text-xs font-medium text-white hover:bg-[#234463]"
              >
                <span>Abrir ficha móvel (EQ-001)</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#5EEAD4]" aria-hidden="true" />
              </Link>
              <Link
                to="/"
                className="mt-2 block px-1 text-xs font-medium text-[#9FB5CA] hover:text-white"
              >
                ← Voltar à página do produto
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <Modal
          className="no-print fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navegação móvel"
          onClose={() => setMobileMenuOpen(false)}
        >
          <div className="fixed inset-0 bg-[#0B1B2B]/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[#13293D] text-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[#23415C] px-4">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-[#176B5B] text-white">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{APP_CONFIG.brandName}</span>
                <span className="rounded border border-[#2B4966] bg-[#1B3650] px-1.5 py-0.5 text-[10px] font-medium text-[#CBD7E4]">
                  {pilot ? 'Empresa' : APP_CONFIG.demoLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#CBD7E4] hover:bg-[#1C3852] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-[#23415C] px-4 py-3">
              <p className="text-xs font-semibold text-white">{effectiveState.company.tradeName}</p>
              <p className="text-xs text-[#9FB5CA] tabular-nums">
                Ref.: {formatDateBR(APP_CONFIG.demoClockDate)}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavLinks(() => setMobileMenuOpen(false))}
            </div>
            <div className="border-t border-[#23415C] p-4">
              {pilot ? (
                <PilotAccount />
              ) : (
                <>
                  <label
                    htmlFor="mobile-role-select"
                    className="block text-xs font-semibold text-[#CBD7E4]"
                  >
                    Perfil simulado
                  </label>
                  <select
                    id="mobile-role-select"
                    value={demoSettings.activeDemoRole}
                    onChange={(e) => setDemoRole(e.target.value as UserRole)}
                    className="mt-1.5 w-full min-h-[44px] rounded-md border border-[#345678] bg-[#102436] px-3 text-sm text-white"
                  >
                    <option value="admin">Administrador</option>
                    <option value="operator">Operador</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="no-print sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-[#DCE4EC] bg-white px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#DCE4EC] text-[#17324D] hover:bg-[#F4F7FA] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight tracking-tight text-[#17324D] sm:text-xl sm:leading-normal">
                {title}
              </h1>
              {subtitle && <p className="truncate text-xs text-[#526980] sm:text-sm">{subtitle}</p>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {demoSettings.activeDemoRole === 'viewer' && location.pathname.startsWith('/app') && (
              <span className="hidden rounded border border-[#F2D3AA] bg-[#FEF6EB] px-2.5 py-1 text-xs font-medium text-[#B76A12] sm:inline-block">
                Modo Visualizador (somente leitura)
              </span>
            )}
            {primaryAction}
          </div>
        </header>
        <PilotSyncBar />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {demoSettings.simulateLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Carregando conteúdo">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-[#DCE4EC] bg-white p-4"
                  >
                    <div className="h-3 w-24 rounded bg-[#DCE4EC]" />
                    <div className="mt-3 h-7 w-16 rounded bg-[#EAF0F6]" />
                  </div>
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-xl border border-[#DCE4EC] bg-white p-6" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};
