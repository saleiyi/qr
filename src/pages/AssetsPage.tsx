import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, FileUp, Plus, QrCode, Search, X } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { AssetFormDrawer } from '../components/AssetFormDrawer';
import { CsvImportModal } from '../components/CsvImportModal';
import { QrLabelPrintModal } from '../components/QrLabelPrintModal';
import { AssetIllustration } from '../components/AssetIllustration';
import { InspectionStatusBadge, OperationalStatusBadge } from '../components/StatusBadge';
import {
  computeAssetInspectionStatus,
  filterAssets,
  getAssetOpenIssues,
} from '../utils/domainLogic';
import { buildAssetsCsv, downloadTextFile } from '../utils/csv';
import { formatDateBR } from '../utils/date';
import { t } from '../i18n';

const PAGE_SIZE = 10;

export const AssetsPage: React.FC = () => {
  const { isPilot } = useAppState();
  const { effectiveState, demoSettings, addToast } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const siteId = searchParams.get('site') ?? 'all';
  const category = searchParams.get('category') ?? 'all';
  const inspectionStatus = searchParams.get('inspectionStatus') ?? 'all';
  const operationalStatus = searchParams.get('operationalStatus') ?? 'all';
  const pageParam = Number(searchParams.get('page') ?? '1');
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const isViewer =
    demoSettings.activeDemoRole === 'viewer' ||
    (isPilot && demoSettings.activeDemoRole !== 'admin');

  // Support /app/assets?new=1 shortcut from dashboard
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      if (!isViewer) setDrawerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, isViewer]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    Boolean(search) ||
    siteId !== 'all' ||
    category !== 'all' ||
    inspectionStatus !== 'all' ||
    operationalStatus !== 'all';

  const filteredAssets = useMemo(
    () =>
      filterAssets(
        effectiveState.assets,
        { search, siteId, category, inspectionStatus, operationalStatus },
        APP_CONFIG.demoClockDate,
      ),
    [effectiveState.assets, search, siteId, category, inspectionStatus, operationalStatus],
  );

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageAssets = filteredAssets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const siteNameOf = (id: string) => effectiveState.sites.find((s) => s.id === id)?.name ?? id;

  const memberNameOf = (id: string) => effectiveState.members.find((m) => m.id === id)?.name ?? '—';

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const pageAllSelected =
    pageAssets.length > 0 && pageAssets.every((a) => selectedIds.includes(a.id));

  const toggleSelectPage = () => {
    if (pageAllSelected) {
      const pageIdSet = new Set(pageAssets.map((a) => a.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...pageAssets.map((a) => a.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const selectedAssets = useMemo(
    () => effectiveState.assets.filter((a) => selectedIds.includes(a.id)),
    [effectiveState.assets, selectedIds],
  );

  const handleExportCsv = () => {
    const scopeAssets = selectedAssets.length > 0 ? selectedAssets : filteredAssets;
    if (scopeAssets.length === 0) return;

    const csv = buildAssetsCsv(
      scopeAssets,
      effectiveState.sites,
      effectiveState.members,
      (asset) => t.inspectionStatus[computeAssetInspectionStatus(asset, APP_CONFIG.demoClockDate)],
    );
    const filename =
      selectedAssets.length > 0
        ? `equipamentos_selecionados_${scopeAssets.length}.csv`
        : `equipamentos_filtrados_${scopeAssets.length}.csv`;
    downloadTextFile(filename, csv);

    addToast({
      type: 'success',
      title: 'Arquivo CSV exportado',
      description:
        selectedAssets.length > 0
          ? `Exportados ${scopeAssets.length} equipamento(s) selecionado(s).`
          : `Exportados ${scopeAssets.length} equipamento(s) conforme filtros atuais.`,
    });
  };

  const currentQueryString = searchParams.toString();

  return (
    <AppShell
      title="Equipamentos"
      subtitle={`${filteredAssets.length} de ${effectiveState.assets.length} equipamentos exibidos`}
      primaryAction={
        !isViewer && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA] whitespace-nowrap"
            >
              <FileUp className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
              <span>Importar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#125548] whitespace-nowrap"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Novo equipamento</span>
            </button>
          </div>
        )
      }
    >
      {/* Filters Toolbar */}
      <div className="rounded-xl border border-[#DCE4EC] bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label htmlFor="assets-search" className="sr-only">
              Buscar por nome, código ou número de série
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526980]"
                aria-hidden="true"
              />
              <input
                id="assets-search"
                type="search"
                value={search}
                onChange={(e) => updateFilter('q', e.target.value)}
                placeholder="Buscar por nome, código (EQ-001) ou série..."
                className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-[#F4F7FA]/60 pl-9 pr-3 text-sm text-[#17324D] placeholder:text-[#6B8094] focus:bg-white"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-site" className="sr-only">
              Filtrar por local
            </label>
            <select
              id="filter-site"
              value={siteId}
              onChange={(e) => updateFilter('site', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todos os locais</option>
              {effectiveState.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-category" className="sr-only">
              Filtrar por categoria
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todas categorias</option>
              <option value="Climatização">Climatização</option>
              <option value="Compressores">Compressores</option>
              <option value="Movimentação">Movimentação</option>
              <option value="Energia">Energia</option>
              <option value="Ferramentas">Ferramentas</option>
              <option value="Elétrica">Elétrica</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-inspection-status" className="sr-only">
              Filtrar por situação da inspeção
            </label>
            <select
              id="filter-inspection-status"
              value={inspectionStatus}
              onChange={(e) => updateFilter('inspectionStatus', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todas inspeções</option>
              <option value="overdue">Atrasada</option>
              <option value="due_soon">Vence em breve</option>
              <option value="ok">Em dia</option>
              <option value="never_inspected">Sem inspeção</option>
              <option value="inactive">Desativado</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <select
              aria-label="Filtrar por estado operacional"
              value={operationalStatus}
              onChange={(e) => updateFilter('operationalStatus', e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todos estados</option>
              <option value="active">Em operação</option>
              <option value="maintenance">Em manutenção</option>
              <option value="inactive">Desativado</option>
            </select>
          </div>
        </div>

        {/* Secondary Toolbar: Active filters + Bulk Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE4EC] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-md border border-[#DCE4EC] bg-[#F4F7FA] px-2.5 py-1 text-xs font-medium text-[#17324D] hover:bg-[#EAF0F6]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar filtros
              </button>
            )}
            {!isViewer && (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex sm:hidden items-center gap-1 rounded-md border border-[#DCE4EC] bg-white px-2.5 py-1 text-xs font-medium text-[#17324D]"
              >
                <FileUp className="h-3.5 w-3.5 text-[#176B5B]" aria-hidden="true" />
                Importar CSV
              </button>
            )}
            <span className="text-xs font-medium text-[#526980] tabular-nums">
              {selectedIds.length > 0
                ? `${selectedIds.length} selecionado(s)`
                : `${filteredAssets.length} resultado(s)`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#13293D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1C3852]"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#5EEAD4]" aria-hidden="true" />
                  Gerar etiquetas QR ({selectedAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-medium text-[#526980] hover:text-[#17324D]"
                >
                  Desmarcar
                </button>
              </>
            )}

            <button
              type="button"
              disabled={filteredAssets.length === 0}
              onClick={handleExportCsv}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-[#526980]" aria-hidden="true" />
              <span>
                {selectedAssets.length > 0
                  ? `Exportar CSV (${selectedAssets.length} sel.)`
                  : `Exportar CSV (${filteredAssets.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty / No results states */}
      {effectiveState.assets.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-[#17324D]">
            Sua lista de equipamentos está vazia
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            Cadastre um equipamento manualmente ou importe sua planilha CSV para gerar etiquetas QR.
          </p>
          {!isViewer && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded-lg bg-[#176B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#125548]"
              >
                Cadastrar equipamento
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA]"
              >
                Importar CSV
              </button>
            </div>
          )}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-[#17324D]">
            Nenhum equipamento encontrado para os filtros aplicados
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            Tente ajustar o termo de busca ou limpar os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-4 rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-semibold text-[#176B5B] hover:bg-[#EAF4F1]"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="mt-5 hidden overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-xs md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#DCE4EC] bg-[#EDF2F7] text-[11px] font-bold uppercase tracking-wide text-[#35506B]">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={toggleSelectPage}
                        aria-label="Selecionar todos desta página"
                        className="h-4 w-4 accent-[#176B5B]"
                      />
                    </th>
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Local e setor</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Última inspeção</th>
                    <th className="px-4 py-3">Próxima</th>
                    <th className="px-4 py-3 text-right">Pendências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE4EC]">
                  {pageAssets.map((asset) => {
                    const inspStatus = computeAssetInspectionStatus(
                      asset,
                      APP_CONFIG.demoClockDate,
                    );
                    const openIssuesCount = getAssetOpenIssues(
                      asset.id,
                      effectiveState.issues,
                    ).length;
                    const detailHref = currentQueryString
                      ? `/app/assets/${asset.id}?from=${encodeURIComponent(currentQueryString)}`
                      : `/app/assets/${asset.id}`;

                    return (
                      <tr key={asset.id} className="hover:bg-[#F4F7FA]/70 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(asset.id)}
                            onChange={() => toggleSelect(asset.id)}
                            aria-label={`Selecionar ${asset.code} ${asset.name}`}
                            className="h-4 w-4 accent-[#176B5B]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AssetIllustration
                              category={asset.category}
                              code={asset.code}
                              name={asset.name}
                              photoDataUrl={asset.photoDataUrl}
                              className="h-10 w-12 shrink-0"
                              size="sm"
                            />
                            <div className="min-w-0">
                              <Link
                                to={detailHref}
                                className="block font-semibold text-[#17324D] hover:text-[#176B5B] hover:underline"
                              >
                                {asset.name}
                              </Link>
                              <p className="text-xs text-[#526980]">
                                <span className="font-mono font-medium text-[#17324D]">
                                  {asset.code}
                                </span>{' '}
                                · {asset.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#35506B]">
                          <p className="font-medium text-[#17324D]">{siteNameOf(asset.siteId)}</p>
                          <p className="text-[#526980]">{asset.sector}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#35506B]">
                          {memberNameOf(asset.assigneeId)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <InspectionStatusBadge status={inspStatus} />
                            {asset.operationalStatus !== 'active' && (
                              <OperationalStatusBadge status={asset.operationalStatus} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-[#35506B]">
                          {formatDateBR(asset.lastInspectionAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-[#35506B]">
                          {asset.operationalStatus === 'inactive'
                            ? '—'
                            : formatDateBR(asset.nextInspectionDue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {openIssuesCount > 0 ? (
                            <Link
                              to={`/app/issues?assetId=${asset.id}`}
                              className="font-mono text-xs font-semibold tabular-nums text-[#B42318] hover:underline"
                            >
                              {openIssuesCount} aberta(s)
                            </Link>
                          ) : (
                            <span className="text-xs text-[#6B8094]">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="mt-4 space-y-3 md:hidden">
            {pageAssets.map((asset) => {
              const inspStatus = computeAssetInspectionStatus(asset, APP_CONFIG.demoClockDate);
              const openIssuesCount = getAssetOpenIssues(asset.id, effectiveState.issues).length;
              const detailHref = currentQueryString
                ? `/app/assets/${asset.id}?from=${encodeURIComponent(currentQueryString)}`
                : `/app/assets/${asset.id}`;

              return (
                <div key={asset.id} className="rounded-xl border border-[#DCE4EC] bg-white p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(asset.id)}
                      onChange={() => toggleSelect(asset.id)}
                      aria-label={`Selecionar ${asset.code}`}
                      className="mt-1 h-5 w-5 accent-[#176B5B]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-[#17324D]">
                          {asset.code} · {asset.category}
                        </span>
                        {openIssuesCount > 0 && (
                          <span className="text-xs font-semibold text-[#B42318]">
                            {openIssuesCount} pendência(s)
                          </span>
                        )}
                      </div>
                      <Link
                        to={detailHref}
                        className="mt-1 block text-base font-semibold text-[#17324D]"
                      >
                        {asset.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#526980]">
                        {siteNameOf(asset.siteId)} · {memberNameOf(asset.assigneeId)}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <InspectionStatusBadge status={inspStatus} />
                        {asset.operationalStatus !== 'active' && (
                          <OperationalStatusBadge status={asset.operationalStatus} />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#DCE4EC] pt-2.5 text-xs text-[#476078] tabular-nums">
                        <span>Última: {formatDateBR(asset.lastInspectionAt)}</span>
                        <span>Próx.: {formatDateBR(asset.nextInspectionDue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#476078]">
              <span className="tabular-nums">
                Página {safePage} de {totalPages} ({filteredAssets.length} equipamentos)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('page', String(safePage - 1));
                    setSearchParams(next, { replace: true });
                  }}
                  className="min-h-[36px] rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 font-medium text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set('page', String(safePage + 1));
                    setSearchParams(next, { replace: true });
                  }}
                  className="min-h-[36px] rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 font-medium text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AssetFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <QrLabelPrintModal
        open={qrModalOpen}
        assets={selectedAssets}
        sites={effectiveState.sites}
        onClose={() => setQrModalOpen(false)}
      />
    </AppShell>
  );
};
