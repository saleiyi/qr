import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Download,
  FileText,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { formatDateTimeBR } from '../utils/date';
import { buildRecordsCsv, downloadTextFile } from '../utils/csv';
import type { InspectionRecord } from '../types/domain';
import { InspectionReport } from '../components/InspectionReport';

export const RecordsPage: React.FC = () => {
  const { effectiveState, addToast } = useAppState();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [inspectorFilter, setInspectorFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    searchParams.get('recordId'),
  );
  const [printReportOpen, setPrintReportOpen] = useState(false);

  useEffect(() => {
    const rid = searchParams.get('recordId');
    if (rid) setSelectedRecordId(rid);
  }, [searchParams]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return effectiveState.records.filter((rec) => {
      if (siteFilter !== 'all' && rec.siteIdSnapshot !== siteFilter) {
        return false;
      }
      if (inspectorFilter !== 'all' && rec.inspectorId !== inspectorFilter) {
        return false;
      }
      if (resultFilter !== 'all' && rec.overallResult !== resultFilter) {
        return false;
      }
      const dateOnly = rec.submittedAt.slice(0, 10);
      if (dateFrom && dateOnly < dateFrom) return false;
      if (dateTo && dateOnly > dateTo) return false;

      if (q) {
        const match =
          rec.assetCodeSnapshot.toLowerCase().includes(q) ||
          rec.assetNameSnapshot.toLowerCase().includes(q) ||
          rec.inspectorNameSnapshot.toLowerCase().includes(q) ||
          rec.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    effectiveState.records,
    search,
    siteFilter,
    inspectorFilter,
    resultFilter,
    dateFrom,
    dateTo,
  ]);

  const selectedRecord: InspectionRecord | undefined =
    effectiveState.records.find((r) => r.id === selectedRecordId);

  const siteNameOf = (siteId: string) =>
    effectiveState.sites.find((s) => s.id === siteId)?.name ?? siteId;

  const hasFilters =
    Boolean(search) ||
    siteFilter !== 'all' ||
    inspectorFilter !== 'all' ||
    resultFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const clearFilters = () => {
    setSearch('');
    setSiteFilter('all');
    setInspectorFilter('all');
    setResultFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return;
    const csv = buildRecordsCsv(filteredRecords, effectiveState.sites);
    downloadTextFile(
      `relatorio_inspecoes_${filteredRecords.length}.csv`,
      csv,
    );
    addToast({
      type: 'success',
      title: 'CSV de inspeções exportado',
      description: `Exportados ${filteredRecords.length} registro(s) conforme filtros aplicados.`,
    });
  };

  const closeRecordDrawer = () => {
    setSelectedRecordId(null);
    if (searchParams.has('recordId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('recordId');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <AppShell
      title="Registros e relatórios"
      subtitle={`${filteredRecords.length} inspeção(ões) localizada(s) · Exportação CSV e relatório A4 para PDF`}
      primaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={filteredRecords.length === 0}
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA] disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
            <span>Exportar CSV ({filteredRecords.length})</span>
          </button>
          <button
            type="button"
            disabled={filteredRecords.length === 0}
            onClick={() => setPrintReportOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#125548] disabled:opacity-50 whitespace-nowrap"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Relatório para impressão / PDF</span>
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="no-print rounded-xl border border-[#DCE4EC] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label htmlFor="records-search" className="sr-only">
              Buscar registros
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#526980]"
                aria-hidden="true"
              />
              <input
                id="records-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Equipamento, código ou inspetor..."
                className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] pl-9 pr-3 text-sm text-[#17324D]"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar por local"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
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
            <select
              aria-label="Filtrar por inspetor"
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todos inspetores</option>
              {effectiveState.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar por resultado"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-3 text-xs sm:text-sm text-[#17324D]"
            >
              <option value="all">Todos resultados</option>
              <option value="approved">Aprovada</option>
              <option value="with_issues">Com pendências</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <input
              type="date"
              aria-label="Data inicial"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] px-2 text-xs tabular-nums text-[#17324D]"
            />
            <span className="text-xs text-[#526980]">até</span>
            <input
              type="date"
              aria-label="Data final"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full min-h-[40px] rounded-lg border border-[#DCE4EC] px-2 text-xs tabular-nums text-[#17324D]"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-[#DCE4EC] pt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md border border-[#DCE4EC] bg-[#F4F7FA] px-2.5 py-1 text-xs font-medium text-[#17324D] hover:bg-[#EAF0F6]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar filtros
            </button>
            <span className="text-xs text-[#526980] tabular-nums">
              {filteredRecords.length} registro(s) no escopo do relatório
            </span>
          </div>
        )}
      </div>

      {filteredRecords.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[#DCE4EC] bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#6B8094]" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-[#17324D]">
            Nenhum registro de inspeção encontrado
          </h2>
          <p className="mt-1 text-sm text-[#476078]">
            Ajuste os filtros de período ou realize uma nova inspeção pela ficha do equipamento.
          </p>
        </div>
      ) : (
        <div className="no-print mt-5 overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EC] bg-[#EDF2F7] text-[11px] font-bold uppercase tracking-wide text-[#35506B]">
                  <th className="px-4 py-3">Data e hora</th>
                  <th className="px-4 py-3">Equipamento</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Inspetor</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3 text-right">Itens</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EC]">
                  {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#F4F7FA]/70">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-[#35506B] whitespace-nowrap">
                      {formatDateTimeBR(rec.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/app/assets/${rec.assetId}`}
                        className="font-mono text-xs font-semibold text-[#176B5B] hover:underline"
                      >
                        {rec.assetCodeSnapshot}
                      </Link>
                      <p className="text-sm font-medium text-[#17324D]">
                        {rec.assetNameSnapshot}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#35506B]">
                      {siteNameOf(rec.siteIdSnapshot)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#35506B]">
                      {rec.inspectorNameSnapshot}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#476078] whitespace-nowrap">
                      {rec.conformingCount}C / {rec.nonConformingCount}NC / {rec.naCount}N/A
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRecordId(rec.id)}
                        className="rounded-lg border border-[#DCE4EC] bg-white px-3 py-1.5 text-xs font-semibold text-[#17324D] hover:bg-[#EAF4F1] hover:text-[#176B5B] whitespace-nowrap"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection Record Detail Drawer */}
      {selectedRecord && (
        <div
          className="no-print fixed inset-0 z-50 flex justify-end bg-[#17324D]/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-detail-title"
        >
          <div className="fixed inset-0" onClick={closeRecordDrawer} />
          <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
              <div>
                <p className="font-mono text-xs text-[#526980]">
                  Registro {selectedRecord.id} ·{' '}
                  {formatDateTimeBR(selectedRecord.submittedAt)}
                </p>
                <h2
                  id="record-detail-title"
                  className="text-base font-bold text-[#17324D]"
                >
                  {selectedRecord.assetCodeSnapshot} —{' '}
                  {selectedRecord.assetNameSnapshot}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeRecordDrawer}
                aria-label="Fechar detalhe do registro"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4 text-xs">
                <div>
                  <span className="text-[#526980]">Inspetor</span>
                  <p className="mt-0.5 font-semibold text-[#17324D]">
                    {selectedRecord.inspectorNameSnapshot}
                  </p>
                </div>
                <div>
                  <span className="text-[#526980]">Local</span>
                  <p className="mt-0.5 font-semibold text-[#17324D]">
                    {siteNameOf(selectedRecord.siteIdSnapshot)}
                  </p>
                </div>
                <div>
                  <span className="text-[#526980]">Modelo utilizado</span>
                  <p className="mt-0.5 font-medium text-[#17324D]">
                    {selectedRecord.templateNameSnapshot}
                  </p>
                </div>
                <div>
                  <span className="text-[#526980]">Resultado</span>
                  <p
                    className={`mt-0.5 font-semibold ${
                      selectedRecord.overallResult === 'approved'
                        ? 'text-[#137333]'
                        : 'text-[#B42318]'
                    }`}
                  >
                    {selectedRecord.overallResult === 'approved'
                      ? 'Aprovada'
                      : `Com pendências (${selectedRecord.nonConformingCount})`}
                  </p>
                </div>
              </div>

              {selectedRecord.generalNotes && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#526980]">
                    Observações gerais
                  </h3>
                  <p className="mt-1 rounded-lg border border-[#DCE4EC] p-3 text-sm text-[#17324D]">
                    {selectedRecord.generalNotes}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#526980]">
                  Respostas registradas (snapshot histórico)
                </h3>
                <ul className="mt-2 divide-y divide-[#DCE4EC] rounded-lg border border-[#DCE4EC]">
                  {selectedRecord.answers.map((ans) => (
                    <li key={ans.itemId} className="p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-[#526980]">
                            {ans.section}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-[#17324D]">
                            {ans.label}
                          </p>
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
                      {ans.numericValue && (
                        <p className="mt-1 font-mono text-[#35506B]">
                          Leitura: {ans.numericValue} {ans.unit}
                        </p>
                      )}
                      {ans.note && (
                        <p className="mt-1 text-[#B42318]">Obs.: {ans.note}</p>
                      )}
                      {ans.photoDataUrl && (
                        <img
                          src={ans.photoDataUrl}
                          alt={`Foto de ${ans.label}`}
                          referrerPolicy="no-referrer"
                          className="mt-2 max-h-40 rounded border border-[#DCE4EC] object-contain"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report View (A4 Print / Save as PDF) */}
      {printReportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/50 p-4 print:static print:block print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-report-title"
        >
          <div className="print-container flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-[#DCE4EC] bg-white shadow-2xl print:max-h-none print:border-none print:shadow-none">
            <div className="no-print flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
              <div>
                <h2
                  id="print-report-title"
                  className="text-lg font-semibold text-[#17324D]"
                >
                  Prévia do relatório para impressão ou PDF
                </h2>
                <p className="text-xs text-[#526980]">
                  Os controles e menus são ocultados automaticamente ao imprimir ou salvar em PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  Imprimir / Salvar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPrintReportOpen(false)}
                  aria-label="Fechar prévia do relatório"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
              <InspectionReport
                records={filteredRecords}
                company={effectiveState.company}
                sites={effectiveState.sites}
                issues={effectiveState.issues}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
