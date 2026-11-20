import { Modal } from './Modal';
import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import {
  downloadTextFile,
  SAMPLE_IMPORT_CSV,
  validateCsvAssetImport,
  type CsvImportValidationResult,
} from '../utils/csv';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ open, onClose }) => {
  const { state, importAssetsBatch } = useAppState();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [validation, setValidation] = useState<CsvImportValidationResult | null>(
    null,
  );
  const [importedCount, setImportedCount] = useState(0);

  if (!open) return null;

  const resetModal = () => {
    setStep(1);
    setFileName('');
    setFileError(null);
    setValidation(null);
    setImportedCount(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && file.type !== 'text/csv') {
      setFileError(
        'Formato inválido. Esta etapa aceita apenas arquivos CSV (.csv) com colunas separadas por vírgula.',
      );
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setFileError('Não foi possível ler o arquivo selecionado.');
    };
    reader.onload = () => {
      const content = String(reader.result ?? '');
      const result = validateCsvAssetImport(content, {
        existingAssets: state.assets,
        sites: state.sites,
        members: state.members,
        templates: state.templates,
      });
      setFileName(file.name);
      setValidation(result);
      setStep(2);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownloadSample = () => {
    downloadTextFile('modelo_importacao_ativos.csv', '\uFEFF' + SAMPLE_IMPORT_CSV);
  };

  const handleConfirmImport = () => {
    if (!validation) return;
    const validDrafts = validation.rows
      .filter((r) => r.errors.length === 0 && r.assetDraft)
      .map((r) => r.assetDraft!);

    if (validDrafts.length === 0) return;

    const res = importAssetsBatch(validDrafts);
    if (res.ok) {
      setImportedCount(res.importedCount);
      setStep(3);
    }
  };

  return (
    <Modal
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#17324D]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-import-title"
      onClose={handleClose}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-[#DCE4EC] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
          <div>
            <h2
              id="csv-import-title"
              className="text-lg font-semibold text-[#17324D]"
            >
              Importar equipamentos via CSV
            </h2>
            <p className="text-xs text-[#526980]">
              Etapa {step} de 3 — {step === 1 ? 'Enviar arquivo CSV' : step === 2 ? 'Revisão e validação' : 'Importação concluída'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar importação CSV"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-3 border-b border-[#DCE4EC] bg-[#F4F7FA] text-xs font-medium">
          <div className={`px-4 py-2.5 ${step === 1 ? 'bg-white font-semibold text-[#176B5B]' : 'text-[#526980]'}`}>
            1. Enviar CSV
          </div>
          <div className={`border-x border-[#DCE4EC] px-4 py-2.5 ${step === 2 ? 'bg-white font-semibold text-[#176B5B]' : 'text-[#526980]'}`}>
            2. Prévia e validação
          </div>
          <div className={`px-4 py-2.5 ${step === 3 ? 'bg-white font-semibold text-[#176B5B]' : 'text-[#526980]'}`}>
            3. Confirmação
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17324D]">
                      Baixe o modelo CSV de referência
                    </p>
                    <p className="mt-0.5 text-xs text-[#476078]">
                      Suporte exclusivo a arquivos <span className="font-mono">.csv</span> com separação por vírgula e colunas fixas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#DCE4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#EAF4F1] hover:text-[#176B5B]"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Baixar exemplo CSV
                  </button>
                </div>
                <p className="mt-3 font-mono text-[11px] text-[#476078] break-all">
                  Colunas obrigatórias: codigo, nome, categoria, local, responsavel, ciclo_dias
                </p>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#B7C7D8] bg-white px-6 py-10 text-center hover:border-[#176B5B] hover:bg-[#F4F7FA]/60">
                <Upload className="h-8 w-8 text-[#176B5B]" aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold text-[#17324D]">
                  Selecione o arquivo CSV do seu computador
                </span>
                <span className="mt-1 text-xs text-[#526980]">
                  Apenas arquivos .csv em UTF-8. Erros por linha serão exibidos antes de confirmar.
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              {fileError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && validation && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
                  <span className="font-semibold text-[#17324D]">{fileName}</span>
                </div>
                {!validation.headerError && (
                  <div className="flex items-center gap-4 text-xs font-medium tabular-nums">
                    <span className="text-[#137333]">
                      {validation.validCount} linha(s) válida(s)
                    </span>
                    <span className="text-[#B42318]">
                      {validation.errorCount} linha(s) com erro
                    </span>
                  </div>
                )}
              </div>

              {validation.headerError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
                >
                  <p className="font-semibold">Não foi possível validar o arquivo</p>
                  <p className="mt-1">{validation.headerError}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#DCE4EC]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DCE4EC] bg-[#F4F7FA] text-[#476078]">
                        <th className="px-3 py-2.5 font-semibold">Linha</th>
                        <th className="px-3 py-2.5 font-semibold">Código</th>
                        <th className="px-3 py-2.5 font-semibold">Equipamento</th>
                        <th className="px-3 py-2.5 font-semibold">Validação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE4EC]">
                      {validation.rows.map((r) => {
                        const hasErr = r.errors.length > 0;
                        return (
                          <tr
                            key={r.rowNumber}
                            className={hasErr ? 'bg-[#FEF3F2]/50' : 'bg-white'}
                          >
                            <td className="px-3 py-2.5 font-mono tabular-nums text-[#526980]">
                              #{r.rowNumber}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-semibold text-[#17324D]">
                              {r.rawCode}
                            </td>
                            <td className="px-3 py-2.5 text-[#17324D]">{r.rawName}</td>
                            <td className="px-3 py-2.5">
                              {hasErr ? (
                                <ul className="list-disc pl-4 text-[#B42318]">
                                  {r.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-medium text-[#137333]">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Pronto para importar
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {validation.errorCount > 0 && validation.validCount > 0 && (
                <p className="text-xs text-[#B76A12]">
                  As linhas com erro não serão importadas silenciosamente. Você pode corrigir o arquivo e reenviar, ou confirmar apenas as {validation.validCount} linhas válidas.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ECF7EE] text-[#137333]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#17324D]">
                {importedCount} equipamento(s) importado(s)
              </h3>
              <p className="mt-1 text-sm text-[#476078]">
                Os novos itens já aparecem na lista de equipamentos com etiqueta QR disponível.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#DCE4EC] px-6 py-4">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={resetModal}
                className="min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA]"
              >
                Escolher outro arquivo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA]"
            >
              {step === 3 ? 'Fechar' : 'Cancelar'}
            </button>
            {step === 2 && validation && !validation.headerError && (
              <button
                type="button"
                disabled={validation.validCount === 0}
                onClick={handleConfirmImport}
                className="min-h-[40px] rounded-lg bg-[#176B5B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#125548] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar importação ({validation.validCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
