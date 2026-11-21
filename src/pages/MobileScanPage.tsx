import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  QrCode,
  Wrench,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { AssetIllustration } from '../components/AssetIllustration';
import { InspectionStatusBadge, OperationalStatusBadge } from '../components/StatusBadge';
import { computeAssetInspectionStatus } from '../utils/domainLogic';
import { formatDateBR, formatDateTimeBR, formatRelativeDueBR } from '../utils/date';
import { loadInspectionDraft } from '../services/storageAdapter';
import type { UserRole } from '../types/domain';

export const MobileScanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state, demoSettings, setDemoRole, isPilot, identity } = useAppState();

  const asset = state.assets.find((a) => a.id === id);

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] px-4 py-12 text-[#17324D]">
        <div className="mx-auto max-w-md rounded-2xl border border-[#DCE4EC] bg-white p-6 text-center">
          <h1 className="text-lg font-bold">Equipamento não encontrado</h1>
          <p className="mt-2 text-sm text-[#476078]">
            {isPilot
              ? 'O equipamento não está disponível na sua empresa. Confira o link ou consulte o administrador.'
              : 'O código QR consultado não corresponde a nenhum ativo cadastrado nesta demonstração.'}
          </p>
          <Link
            to="/app/assets"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#176B5B] px-5 text-sm font-semibold text-white"
          >
            Ver lista de equipamentos
          </Link>
        </div>
      </div>
    );
  }

  const site = state.sites.find((s) => s.id === asset.siteId);
  const assignee = state.members.find((m) => m.id === asset.assigneeId);
  const template = state.templates.find((t) => t.id === asset.templateId);
  const inspStatus = computeAssetInspectionStatus(asset, APP_CONFIG.demoClockDate);
  const openIssues = state.issues.filter((i) => i.assetId === asset.id && i.status !== 'resolved');
  const recentRecords = state.records.filter((r) => r.assetId === asset.id).slice(0, 3);
  const existingDraft = loadInspectionDraft(asset.id);
  const isViewer = demoSettings.activeDemoRole === 'viewer';
  const isInactive = asset.operationalStatus === 'inactive';

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#17324D] pb-24 md:pb-12">
      {/* Compact High-Contrast Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#23415C] bg-[#13293D] text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to={`/app/assets/${asset.id}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[#CBD7E4] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Painel</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <QrCode className="h-4 w-4 text-[#5EEAD4]" aria-hidden="true" />
            <span className="font-mono">{asset.code}</span>
          </div>

          <span className="rounded border border-[#2B4966] bg-[#1B3650] px-2 py-0.5 text-[10px] font-medium text-[#CBD7E4]">
            {isPilot ? 'Empresa' : APP_CONFIG.demoLabel}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {/* Simulated Role View Banner */}
        {!isPilot && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DCE4EC] bg-white px-4 py-2.5 text-xs shadow-xs">
            <span className="text-[#476078]">Visualização simulada de perfil:</span>
            <div className="inline-flex rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-0.5">
              {(
                [
                  { id: 'operator', label: 'Operador' },
                  { id: 'admin', label: 'Admin' },
                  { id: 'viewer', label: 'Visualizador' },
                ] as Array<{ id: UserRole; label: string }>
              ).map((roleOpt) => (
                <button
                  key={roleOpt.id}
                  type="button"
                  onClick={() => setDemoRole(roleOpt.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                    demoSettings.activeDemoRole === roleOpt.id
                      ? 'bg-[#176B5B] text-white'
                      : 'text-[#476078] hover:text-[#17324D]'
                  }`}
                >
                  {roleOpt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isPilot && state.scheduleWarnings?.length ? (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-[#F2D3AA] bg-[#FEF6EB] p-4 text-sm leading-relaxed text-[#8A4B0F]"
          >
            {state.scheduleWarnings.join(' ')}
          </p>
        ) : null}
        {isPilot && (
          <p className="mb-4 text-sm text-[#526980]">{identity?.name} · Acesso da sua empresa</p>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Primary Identity & Task Card */}
          <div className="space-y-4 lg:col-span-7">
            <section className="overflow-hidden rounded-2xl border border-[#DCE4EC] bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-[#23415C] bg-[#13293D] px-5 py-2.5 text-xs text-[#CBD7E4]">
                <span className="font-mono font-bold text-[#5EEAD4]">
                  {asset.code} · {asset.category}
                </span>
                <span className="truncate font-mono text-[11px] text-[#9FB5CA]">
                  {asset.manufacturer} {asset.model}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <AssetIllustration
                    category={asset.category}
                    code={asset.code}
                    name={asset.name}
                    photoDataUrl={asset.photoDataUrl}
                    className="h-24 w-28 shrink-0"
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold leading-snug text-[#17324D] sm:text-xl">
                      {asset.name}
                    </h1>
                    <p className="mt-1 text-xs text-[#476078]">
                      {site?.name} · {asset.sector}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <OperationalStatusBadge status={asset.operationalStatus} />
                      <InspectionStatusBadge status={inspStatus} />
                    </div>
                  </div>
                </div>

                {/* What is pending right now */}
                <div className="mt-4 rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-4">
                  <p className="text-xs font-semibold text-[#526980]">Situação e próximo passo</p>

                  {isInactive ? (
                    <p className="mt-1.5 text-sm font-medium text-[#476078]">
                      Equipamento desativado. Inspeções periódicas estão suspensas; consulte o
                      histórico abaixo.
                    </p>
                  ) : (
                    <div className="mt-1.5 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#17324D]">
                        {inspStatus === 'overdue' ? (
                          <>
                            <AlertCircle
                              className="h-4 w-4 shrink-0 text-[#B42318]"
                              aria-hidden="true"
                            />
                            <span className="text-[#B42318]">
                              {formatRelativeDueBR(
                                asset.nextInspectionDue,
                                APP_CONFIG.demoClockDate,
                              )}
                            </span>
                          </>
                        ) : inspStatus === 'due_soon' ? (
                          <>
                            <Clock className="h-4 w-4 shrink-0 text-[#B76A12]" aria-hidden="true" />
                            <span className="text-[#B76A12]">
                              {formatRelativeDueBR(
                                asset.nextInspectionDue,
                                APP_CONFIG.demoClockDate,
                              )}
                            </span>
                          </>
                        ) : inspStatus === 'never_inspected' ? (
                          <>
                            <ClipboardCheck
                              className="h-4 w-4 shrink-0 text-[#35506B]"
                              aria-hidden="true"
                            />
                            <span>Realizar primeira inspeção de comissionamento</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-[#137333]"
                              aria-hidden="true"
                            />
                            <span>
                              Inspeção periódica em dia (próxima em{' '}
                              {formatDateBR(asset.nextInspectionDue)})
                            </span>
                          </>
                        )}
                      </div>

                      {openIssues.length > 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-2 text-xs text-[#B42318]">
                          <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            Existem <strong>{openIssues.length} pendência(s) aberta(s)</strong>{' '}
                            neste equipamento aguardando resolução.
                          </span>
                        </div>
                      )}

                      {existingDraft && (
                        <div className="rounded-lg border border-[#F2D3AA] bg-[#FEF6EB] px-3 py-2 text-xs text-[#B76A12]">
                          Você possui um rascunho salvo em andamento para este equipamento.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop inline CTA */}
                {!isViewer && !isInactive && (
                  <Link
                    to={`/a/${asset.id}/request`}
                    className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE4EC] bg-white px-4 text-sm font-semibold text-[#176B5B] hover:bg-[#EAF4F0]"
                  >
                    <Wrench className="h-4 w-4" />
                    Solicitar manutenção
                  </Link>
                )}
                {state.tasks.some(
                  (task) => task.assetId === asset.id && task.status === 'pending',
                ) && (
                  <div className="mt-4 space-y-2 rounded-xl border border-[#DCE4EC] bg-white p-4">
                    <h2 className="text-sm font-semibold">Inspeções programadas</h2>
                    {state.tasks
                      .filter((task) => task.assetId === asset.id && task.status === 'pending')
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .slice(0, 2)
                      .map((task) => (
                        <Link
                          key={task.id}
                          to={
                            isViewer || (isPilot && task.assigneeId !== identity?.memberId)
                              ? '/app/plans'
                              : `/a/${asset.id}/inspect?taskId=${encodeURIComponent(task.id)}`
                          }
                          className="block rounded-lg bg-[#F4F7FA] p-3 text-xs leading-relaxed text-[#17324D]"
                        >
                          <strong>{task.planName}</strong>
                          <span className="mt-1 block text-[#526980]">
                            {formatDateBR(task.dueDate)} ·{' '}
                            {isViewer || (isPilot && task.assigneeId !== identity?.memberId)
                              ? 'Consultar na agenda'
                              : 'Abrir inspeção'}
                          </span>
                        </Link>
                      ))}
                    <Link
                      to="/app/plans"
                      className="block min-h-[36px] pt-2 text-xs font-semibold text-[#176B5B]"
                    >
                      Ver agenda completa
                    </Link>
                  </div>
                )}
                <div className="mt-4 hidden md:block">
                  {isViewer ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] px-4 py-3 text-xs text-[#476078]">
                      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isPilot
                          ? 'Seu perfil permite consultar a ficha e o histórico. Solicite acesso de operador ao administrador para inspecionar.'
                          : 'Perfil Visualizador: apenas leitura de ficha e histórico. Alterne para Operador ou Admin para inspecionar.'}
                      </span>
                    </div>
                  ) : isInactive ? (
                    <Link
                      to={`/app/assets/${asset.id}`}
                      className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-[#DCE4EC] bg-white text-sm font-semibold text-[#17324D] hover:bg-[#F4F7FA]"
                    >
                      Abrir ficha completa no painel
                    </Link>
                  ) : (
                    <Link
                      to={`/a/${asset.id}/inspect`}
                      className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#176B5B] px-5 text-sm font-semibold text-white hover:bg-[#125548]"
                    >
                      <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {existingDraft ? 'Continuar inspeção (rascunho)' : 'Iniciar inspeção'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* Technical Specs */}
            <section className="rounded-2xl border border-[#DCE4EC] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#17324D]">
                Dados essenciais do equipamento
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#526980]">Fabricante / Modelo</dt>
                  <dd className="mt-0.5 font-medium text-[#17324D]">
                    {asset.manufacturer} {asset.model}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#526980]">Nº de série</dt>
                  <dd className="mt-0.5 font-mono font-medium text-[#17324D]">
                    {asset.serialNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#526980]">Responsável</dt>
                  <dd className="mt-0.5 font-medium text-[#17324D]">{assignee?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#526980]">Checklist padrão</dt>
                  <dd className="mt-0.5 font-medium text-[#17324D]">
                    {template?.name ?? 'Padrão'}
                  </dd>
                </div>
              </dl>
              {asset.notes && (
                <p className="mt-3 border-t border-[#DCE4EC] pt-3 text-xs leading-relaxed text-[#476078]">
                  {asset.notes}
                </p>
              )}
            </section>
          </div>

          {/* Right Column: Open Issues & Recent Inspections */}
          <div className="space-y-4 lg:col-span-5">
            {openIssues.length > 0 && (
              <section className="rounded-2xl border border-[#DCE4EC] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#17324D]">
                    Pendências abertas ({openIssues.length})
                  </h2>
                  <Link
                    to={`/app/issues?assetId=${asset.id}`}
                    className="text-xs font-semibold text-[#176B5B] hover:underline"
                  >
                    Ver no painel
                  </Link>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {openIssues.map((iss) => (
                    <li
                      key={iss.id}
                      className="rounded-xl border border-[#F4C7C3] bg-[#FEF3F2]/50 p-3 text-xs"
                    >
                      <p className="font-semibold text-[#17324D]">{iss.title}</p>
                      <p className="mt-1 text-[#476078]">{iss.description}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-[#B42318] tabular-nums">
                        Prazo: {formatDateBR(iss.dueDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-[#DCE4EC] bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#17324D]">Últimas inspeções</h2>
                <Link
                  to={`/app/assets/${asset.id}`}
                  className="text-xs font-semibold text-[#176B5B] hover:underline"
                >
                  Histórico completo
                </Link>
              </div>
              {recentRecords.length === 0 ? (
                <p className="mt-3 text-xs text-[#526980]">
                  Ainda não há inspeções registradas para este equipamento.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[#DCE4EC]">
                  {recentRecords.map((rec) => (
                    <li key={rec.id} className="py-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-medium tabular-nums text-[#17324D]">
                          {formatDateTimeBR(rec.submittedAt)}
                        </span>
                        <span
                          className={`font-semibold ${
                            rec.overallResult === 'approved' ? 'text-[#137333]' : 'text-[#B42318]'
                          }`}
                        >
                          {rec.overallResult === 'approved' ? 'Aprovada' : 'Com pendências'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[#526980]">Inspetor: {rec.inspectorNameSnapshot}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {demoSettings.activeDemoRole === 'admin' && (
              <div className="rounded-2xl border border-[#DCE4EC] bg-white p-4 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#476078]">
                    <Wrench className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
                    <span>Ações administrativas disponíveis no painel</span>
                  </div>
                  <Link
                    to={`/app/assets/${asset.id}`}
                    className="font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
                  >
                    Editar ficha →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom CTA (within 15% height cap) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#DCE4EC] bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden">
        {isViewer ? (
          <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] px-3 text-xs font-medium text-[#476078]">
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Modo Visualizador (somente leitura)</span>
          </div>
        ) : isInactive ? (
          <Link
            to={`/app/assets/${asset.id}`}
            className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-[#DCE4EC] bg-white text-sm font-semibold text-[#17324D]"
          >
            Ver histórico no painel
          </Link>
        ) : (
          <Link
            to={`/a/${asset.id}/inspect`}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#176B5B] px-5 text-sm font-semibold text-white active:scale-[0.99]"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>{existingDraft ? 'Continuar inspeção' : 'Iniciar inspeção'}</span>
          </Link>
        )}
      </div>
    </div>
  );
};
