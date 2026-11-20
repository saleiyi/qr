import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Printer,
  Smartphone,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { AssetIllustration } from '../components/AssetIllustration';
import { AssetFormDrawer } from '../components/AssetFormDrawer';
import { QrCodeDisplay, downloadQrCodePng } from '../components/QrCodeDisplay';
import { QrLabelPrintModal } from '../components/QrLabelPrintModal';
import {
  InspectionStatusBadge,
  IssuePriorityLabel,
  IssueStatusBadge,
  OperationalStatusBadge,
} from '../components/StatusBadge';
import { computeAssetInspectionStatus } from '../utils/domainLogic';
import {
  formatDateBR,
  formatDateTimeBR,
  formatRelativeDueBR,
} from '../utils/date';

type DetailTab = 'overview' | 'history' | 'issues' | 'files';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { state, demoSettings, addToast } = useAppState();

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const asset = state.assets.find((a) => a.id === id);
  const fromQuery = searchParams.get('from');
  const backHref = fromQuery ? `/app/assets?${fromQuery}` : '/app/assets';

  if (!asset) {
    return (
      <AppShell title="Equipamento não encontrado">
        <div className="rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-[#17324D]">
            Este equipamento não foi localizado
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            O código pode ter sido removido ou os dados da demonstração foram restaurados.
          </p>
          <Link
            to="/app/assets"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#176B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125548]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para equipamentos
          </Link>
        </div>
      </AppShell>
    );
  }

  const site = state.sites.find((s) => s.id === asset.siteId);
  const assignee = state.members.find((m) => m.id === asset.assigneeId);
  const template = state.templates.find((t) => t.id === asset.templateId);
  const inspStatus = computeAssetInspectionStatus(asset, APP_CONFIG.demoClockDate);

  const assetRecords = state.records.filter((r) => r.assetId === asset.id);
  const assetIssues = state.issues.filter((i) => i.assetId === asset.id);
  const openIssues = assetIssues.filter((i) => i.status !== 'resolved');

  const scanPath = `/a/${asset.id}`;
  const scanUrl = `${window.location.origin}${scanPath}`;
  const isViewer = demoSettings.activeDemoRole === 'viewer';

  const handleCopyScanUrl = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      addToast({
        type: 'success',
        title: 'Link do QR Code copiado',
        description: scanUrl,
      });
    } catch {
      addToast({
        type: 'info',
        title: 'Endereço da ficha móvel',
        description: scanUrl,
      });
    }
  };

  const handleDownloadQrPng = async () => {
    await downloadQrCodePng(scanUrl, `QR_${asset.code}.png`);
    addToast({
      type: 'success',
      title: 'Imagem PNG baixada',
      description: `Arquivo QR_${asset.code}.png gerado.`,
    });
  };

  return (
    <AppShell
      title={`${asset.code} — ${asset.name}`}
      subtitle={`${site?.name ?? ''} · Setor ${asset.sector}`}
      primaryAction={
        <div className="flex items-center gap-2">
          {!isViewer && (
            <button
              type="button"
              onClick={() => setEditDrawerOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA] whitespace-nowrap"
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              <span>Editar</span>
            </button>
          )}
          <Link
            to={`/a/${asset.id}/inspect`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#125548] whitespace-nowrap"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>Iniciar inspeção</span>
          </Link>
        </div>
      }
    >
      <div className="mb-4">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#476078] hover:text-[#17324D]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar para lista de equipamentos
        </Link>
      </div>

      {/* Identity Header Card */}
      <section className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#23415C] bg-[#13293D] px-5 py-2.5 text-xs text-[#CBD7E4]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-[#5EEAD4]">
              {asset.code}
            </span>
            <span aria-hidden="true">·</span>
            <span>{asset.category}</span>
            <span aria-hidden="true">·</span>
            <span>
              {asset.manufacturer} {asset.model}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#9FB5CA]">
            Série: {asset.serialNumber}
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <AssetIllustration
              category={asset.category}
              code={asset.code}
              name={asset.name}
              photoDataUrl={asset.photoDataUrl}
              className="h-32 w-full sm:w-44 shrink-0"
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#17324D]">
                {asset.name}
              </h2>
              <p className="mt-1 text-sm text-[#476078]">
                {site?.name} · {asset.sector} · Responsável:{' '}
                <strong className="font-semibold text-[#17324D]">
                  {assignee?.name ?? '—'}
                </strong>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <OperationalStatusBadge status={asset.operationalStatus} />
                <InspectionStatusBadge status={inspStatus} />
                {openIssues.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded border border-[#F4C7C3] bg-[#FEF3F2] px-2 py-0.5 text-xs font-semibold text-[#B42318]">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {openIssues.length} pendência(s) sem solução
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4 sm:grid-cols-3 lg:min-w-[330px]">
            <div>
              <span className="text-[11px] font-medium text-[#526980]">
                Última inspeção
              </span>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#17324D]">
                {formatDateBR(asset.lastInspectionAt)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#526980]">
                Próxima janela
              </span>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#17324D]">
                {asset.operationalStatus === 'inactive'
                  ? 'Suspensa'
                  : formatDateBR(asset.nextInspectionDue)}
              </p>
              {asset.operationalStatus !== 'inactive' && (
                <p className="text-[11px] text-[#476078]">
                  {formatRelativeDueBR(
                    asset.nextInspectionDue,
                    APP_CONFIG.demoClockDate,
                  )}
                </p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-[#526980]">
                Ciclo / Modelo
              </span>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#17324D]">
                A cada {asset.inspectionCycleDays} dias
              </p>
              <p className="truncate text-[11px] text-[#476078]">
                {template?.name ?? 'Padrão'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Left Area: Tabs & Details */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-[#DCE4EC] bg-white">
            <div
              className="flex overflow-x-auto border-b border-[#DCE4EC] px-2 pt-2"
              role="tablist"
              aria-label="Seções da ficha do equipamento"
            >
              {[
                { id: 'overview' as const, label: 'Informações gerais' },
                {
                  id: 'history' as const,
                  label: `Histórico de inspeções (${assetRecords.length})`,
                },
                {
                  id: 'issues' as const,
                  label: `Pendências (${assetIssues.length})`,
                },
                {
                  id: 'files' as const,
                  label: `Arquivos e fotos (${asset.files.length + (asset.photoDataUrl ? 1 : 0)})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#176B5B] text-[#176B5B]'
                      : 'border-transparent text-[#526980] hover:text-[#17324D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg border border-[#DCE4EC] p-3.5">
                      <dt className="text-xs text-[#526980]">Fabricante</dt>
                      <dd className="mt-0.5 font-medium text-[#17324D]">
                        {asset.manufacturer}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-[#DCE4EC] p-3.5">
                      <dt className="text-xs text-[#526980]">Modelo</dt>
                      <dd className="mt-0.5 font-medium text-[#17324D]">
                        {asset.model}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-[#DCE4EC] p-3.5">
                      <dt className="text-xs text-[#526980]">Número de série</dt>
                      <dd className="mt-0.5 font-mono font-medium text-[#17324D]">
                        {asset.serialNumber}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-[#DCE4EC] p-3.5">
                      <dt className="text-xs text-[#526980]">
                        Modelo de inspeção vinculado
                      </dt>
                      <dd className="mt-0.5 font-medium text-[#17324D]">
                        {template?.name ?? 'Não definido'}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#526980]">
                      Observações técnicas
                    </h3>
                    <p className="mt-2 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4 text-sm leading-relaxed text-[#35506B]">
                      {asset.notes || 'Nenhuma observação técnica registrada.'}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  {assetRecords.length === 0 ? (
                    <div className="py-8 text-center">
                      <Calendar
                        className="mx-auto h-7 w-7 text-[#6B8094]"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-semibold text-[#17324D]">
                        Nenhuma inspeção registrada ainda
                      </p>
                      <p className="mt-1 text-xs text-[#526980]">
                        Inicie a primeira inspeção para começar o histórico deste equipamento.
                      </p>
                      <Link
                        to={`/a/${asset.id}/inspect`}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
                      >
                        Iniciar primeira inspeção
                      </Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {assetRecords.map((rec) => {
                        const isExpanded = expandedRecordId === rec.id;
                        return (
                          <li
                            key={rec.id}
                            className="rounded-lg border border-[#DCE4EC] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-[#17324D]">
                                    {formatDateTimeBR(rec.submittedAt)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={`text-xs font-semibold ${
                                      rec.overallResult === 'approved'
                                        ? 'text-[#137333]'
                                        : 'text-[#B42318]'
                                    }`}
                                  >
                                    {rec.overallResult === 'approved'
                                      ? 'Aprovada'
                                      : `Com pendências (${rec.nonConformingCount})`}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#476078]">
                                  Inspetor: {rec.inspectorNameSnapshot} · Modelo:{' '}
                                  {rec.templateNameSnapshot}
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedRecordId(isExpanded ? null : rec.id)
                                }
                                className="rounded-md border border-[#DCE4EC] px-2.5 py-1 text-xs font-medium text-[#17324D] hover:bg-[#F4F7FA]"
                              >
                                {isExpanded ? 'Ocultar itens' : 'Ver respostas'}
                              </button>
                            </div>

                            {rec.generalNotes && (
                              <p className="mt-2 text-xs text-[#35506B]">
                                {rec.generalNotes}
                              </p>
                            )}

                            {isExpanded && (
                              <div className="mt-3 divide-y divide-[#DCE4EC] rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] px-3">
                                {rec.answers.map((ans) => (
                                  <div
                                    key={ans.itemId}
                                    className="flex flex-col justify-between gap-1 py-2.5 text-xs sm:flex-row sm:items-center"
                                  >
                                    <div>
                                      <p className="font-medium text-[#17324D]">
                                        {ans.label}
                                      </p>
                                      {ans.numericValue && (
                                        <p className="font-mono text-[#476078]">
                                          Leitura: {ans.numericValue} {ans.unit}
                                        </p>
                                      )}
                                      {ans.note && (
                                        <p className="mt-0.5 text-[#B42318]">
                                          Obs.: {ans.note}
                                        </p>
                                      )}
                                    </div>
                                    <span
                                      className={`shrink-0 font-semibold ${
                                        ans.status === 'conforming'
                                          ? 'text-[#137333]'
                                          : ans.status === 'non_conforming'
                                            ? 'text-[#B42318]'
                                            : 'text-[#526980]'
                                      }`}
                                    >
                                      {ans.status === 'conforming'
                                        ? 'Conforme'
                                        : ans.status === 'non_conforming'
                                          ? 'Não conforme'
                                          : 'N/A'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'issues' && (
                <div>
                  {assetIssues.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2
                        className="mx-auto h-7 w-7 text-[#137333]"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-semibold text-[#17324D]">
                        Nenhuma pendência registrada para este equipamento
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {assetIssues.map((iss) => (
                        <li
                          key={iss.id}
                          className="rounded-lg border border-[#DCE4EC] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <IssueStatusBadge status={iss.status} />
                              <IssuePriorityLabel priority={iss.priority} />
                            </div>
                            <span className="font-mono text-xs text-[#526980] tabular-nums">
                              Aberta em {formatDateBR(iss.createdAt)} · Prazo{' '}
                              {formatDateBR(iss.dueDate)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-[#17324D]">
                            {iss.title}
                          </p>
                          <p className="mt-1 text-xs text-[#476078]">
                            {iss.description}
                          </p>
                          {iss.resolutionNote && (
                            <p className="mt-2 rounded bg-[#ECF7EE] px-3 py-2 text-xs text-[#137333]">
                              <strong>Tratamento ({formatDateBR(iss.resolvedAt)}):</strong>{' '}
                              {iss.resolutionNote}
                            </p>
                          )}
                          <div className="mt-3">
                            <Link
                              to={`/app/issues?issueId=${iss.id}`}
                              className="text-xs font-semibold text-[#176B5B] hover:underline"
                            >
                              {iss.status === 'resolved'
                                ? 'Ver detalhe no painel de pendências →'
                                : 'Registrar tratamento e concluir →'}
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  {asset.photoDataUrl && (
                    <div className="rounded-lg border border-[#DCE4EC] p-3">
                      <p className="mb-2 text-xs font-semibold text-[#476078]">
                        Foto principal do equipamento
                      </p>
                      <img
                        src={asset.photoDataUrl}
                        alt={`Foto de ${asset.name}`}
                        referrerPolicy="no-referrer"
                        className="max-h-64 rounded object-contain"
                      />
                    </div>
                  )}

                  <ul className="divide-y divide-[#DCE4EC] rounded-lg border border-[#DCE4EC]">
                    {asset.files.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText
                            className="h-4 w-4 shrink-0 text-[#176B5B]"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#17324D]">
                              {f.name}
                            </p>
                            <p className="text-[#526980]">
                              {f.sizeLabel} · Enviado em {formatDateBR(f.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="rounded bg-[#F4F7FA] px-2 py-1 text-[11px] font-medium text-[#526980]">
                          Documento de exemplo
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: QR Code Card */}
        <aside className="lg:col-span-4">
          <div className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-xs">
            <div className="border-b border-[#23415C] bg-[#13293D] px-5 py-3 text-white">
              <h2 className="text-sm font-bold">
                Etiqueta e QR Code
              </h2>
              <p className="mt-0.5 text-[11px] text-[#CBD7E4]">
                Escaneando este código, o técnico abre diretamente a ficha móvel.
              </p>
            </div>

            <div className="p-5">
              <div className="flex flex-col items-center rounded-xl border-2 border-[#17324D]/15 bg-[#F4F7FA] p-5">
                <QrCodeDisplay
                  value={scanUrl}
                  size={168}
                  label={`QR Code de ${asset.code}`}
                />
                <p className="mt-3 rounded bg-[#13293D] px-2.5 py-0.5 font-mono text-sm font-bold text-[#5EEAD4]">
                  {asset.code}
                </p>
                <p className="mt-1 max-w-full truncate font-mono text-[11px] text-[#526980]">
                  {scanPath}
                </p>
              </div>

              <div className="mt-4 space-y-2">
              <Link
                to={scanPath}
                className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-lg bg-[#17324D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#10253A]"
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                <span>Abrir página do QR Code</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQrPng}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Baixar PNG
                </button>
                <button
                  type="button"
                  onClick={handleCopyScanUrl}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA]"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar link
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA]"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Imprimir etiqueta A4
              </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <AssetFormDrawer
        open={editDrawerOpen}
        editingAsset={asset}
        onClose={() => setEditDrawerOpen(false)}
      />

      <QrLabelPrintModal
        open={printModalOpen}
        assets={[asset]}
        sites={state.sites}
        onClose={() => setPrintModalOpen(false)}
      />
    </AppShell>
  );
};
