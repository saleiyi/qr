import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, X } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import type {
  Asset,
  EquipmentCategory,
  OperationalStatus,
} from '../types/domain';
import { validateAssetInput } from '../utils/domainLogic';
import { processImageUpload } from '../services/storageAdapter';
import { ConfirmDialog } from './ConfirmDialog';

interface AssetFormDrawerProps {
  open: boolean;
  editingAsset?: Asset | null;
  onClose: () => void;
  onSaved?: (assetId?: string) => void;
}

const CATEGORIES: EquipmentCategory[] = [
  'Climatização',
  'Compressores',
  'Movimentação',
  'Energia',
  'Ferramentas',
  'Elétrica',
];

export const AssetFormDrawer: React.FC<AssetFormDrawerProps> = ({
  open,
  editingAsset,
  onClose,
  onSaved,
}) => {
  const { state, createAsset, updateAsset, deactivateAsset, reactivateAsset } =
    useAppState();
  const isEditing = Boolean(editingAsset);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('Climatização');
  const [siteId, setSiteId] = useState('');
  const [sector, setSector] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [cycleDays, setCycleDays] = useState('30');
  const [templateId, setTemplateId] = useState('');
  const [operationalStatus, setOperationalStatus] =
    useState<OperationalStatus>('active');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;

    if (editingAsset) {
      setName(editingAsset.name);
      setCode(editingAsset.code);
      setCategory(editingAsset.category);
      setSiteId(editingAsset.siteId);
      setSector(editingAsset.sector);
      setAssigneeId(editingAsset.assigneeId);
      setCycleDays(String(editingAsset.inspectionCycleDays));
      setTemplateId(editingAsset.templateId);
      setOperationalStatus(editingAsset.operationalStatus);
      setManufacturer(editingAsset.manufacturer);
      setModel(editingAsset.model);
      setSerialNumber(editingAsset.serialNumber);
      setNotes(editingAsset.notes);
      setPhotoDataUrl(editingAsset.photoDataUrl);
    } else {
      const nextNum = state.assets.length + 1;
      setName('');
      setCode(`EQ-${String(nextNum).padStart(3, '0')}`);
      setCategory('Climatização');
      setSiteId(state.sites[0]?.id ?? '');
      setSector('');
      setAssigneeId(state.members.find((m) => m.status === 'active')?.id ?? '');
      setCycleDays('30');
      setTemplateId(state.templates[0]?.id ?? '');
      setOperationalStatus('active');
      setManufacturer('');
      setModel('');
      setSerialNumber('');
      setNotes('');
      setPhotoDataUrl(undefined);
    }
    setErrors({});
    setPhotoError(null);
    setIsDirty(false);

    window.setTimeout(() => firstInputRef.current?.focus(), 50);

    return () => {
      prevFocus?.focus?.();
    };
  }, [open, editingAsset, state.assets.length, state.sites, state.members, state.templates]);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDiscardOpen && !confirmDeactivateOpen) {
        requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    const res = await processImageUpload(file);
    if (!res.ok) {
      setPhotoError(res.error ?? 'Erro ao processar imagem.');
      return;
    }
    setPhotoDataUrl(res.dataUrl);
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericCycle = Number(cycleDays);
    const validation = validateAssetInput(
      {
        name,
        code,
        siteId,
        assigneeId,
        inspectionCycleDays: numericCycle,
      },
      state.assets,
      editingAsset?.id,
    );

    if (Object.keys(validation).length > 0) {
      setErrors(validation as Record<string, string>);
      return;
    }

    if (isEditing && editingAsset) {
      const res = updateAsset(editingAsset.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        siteId,
        sector: sector.trim() || 'Geral',
        assigneeId,
        inspectionCycleDays: numericCycle,
        templateId,
        operationalStatus,
        manufacturer: manufacturer.trim() || 'Não informado',
        model: model.trim() || 'Padrão',
        serialNumber: serialNumber.trim() || 'Não informado',
        notes: notes.trim(),
        photoDataUrl,
      });
      if (res.ok) {
        onSaved?.(editingAsset.id);
        onClose();
      }
    } else {
      const res = createAsset({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        siteId,
        sector: sector.trim() || 'Geral',
        assigneeId,
        inspectionCycleDays: numericCycle,
        templateId,
        operationalStatus,
        lastInspectionAt: null,
        nextInspectionDue: null,
        manufacturer: manufacturer.trim() || 'Não informado',
        model: model.trim() || 'Padrão',
        serialNumber: serialNumber.trim() || 'Não informado',
        notes: notes.trim(),
        photoDataUrl,
      });
      if (res.ok) {
        onSaved?.(res.asset?.id);
        onClose();
      }
    }
  };

  return (
    <>
      <div
        className="no-print fixed inset-0 z-40 flex justify-end bg-[#17324D]/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-drawer-title"
      >
        <div
          className="fixed inset-0"
          onClick={requestClose}
          aria-hidden="true"
        />
        <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#DCE4EC] px-6 py-4">
            <div>
              <h2
                id="asset-drawer-title"
                className="text-lg font-semibold text-[#17324D]"
              >
                {isEditing ? `Editar equipamento ${editingAsset?.code}` : 'Novo equipamento'}
              </h2>
              <p className="text-xs text-[#526980]">
                Campos obrigatórios marcados com *
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Fechar painel de equipamento"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA] hover:text-[#17324D]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-y-auto px-6 py-5"
            noValidate
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="asset-name"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Nome do equipamento *
                  </label>
                  <input
                    ref={firstInputRef}
                    id="asset-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsDirty(true);
                      if (errors.name) setErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder="Ex.: Chiller Central Linha A"
                    aria-invalid={Boolean(errors.name)}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] focus:border-[#176B5B]"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-[#B42318]" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="asset-code"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Código *
                  </label>
                  <input
                    id="asset-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setIsDirty(true);
                      if (errors.code) setErrors((p) => ({ ...p, code: '' }));
                    }}
                    placeholder="EQ-027"
                    aria-invalid={Boolean(errors.code)}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 font-mono text-sm text-[#17324D] focus:border-[#176B5B]"
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-[#B42318]" role="alert">
                      {errors.code}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="asset-category"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Categoria *
                  </label>
                  <select
                    id="asset-category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value as EquipmentCategory);
                      setIsDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="asset-site"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Local / Unidade *
                  </label>
                  <select
                    id="asset-site"
                    value={siteId}
                    onChange={(e) => {
                      setSiteId(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D]"
                  >
                    {state.sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="asset-sector"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Setor ou posição
                  </label>
                  <input
                    id="asset-sector"
                    type="text"
                    value={sector}
                    onChange={(e) => {
                      setSector(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ex.: Casa de Máquinas"
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="asset-assignee"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Responsável *
                  </label>
                  <select
                    id="asset-assignee"
                    value={assigneeId}
                    onChange={(e) => {
                      setAssigneeId(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D]"
                  >
                    {state.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="asset-cycle"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Ciclo de inspeção (dias) *
                  </label>
                  <input
                    id="asset-cycle"
                    type="number"
                    min={1}
                    max={730}
                    value={cycleDays}
                    onChange={(e) => {
                      setCycleDays(e.target.value);
                      setIsDirty(true);
                      if (errors.inspectionCycleDays) {
                        setErrors((p) => ({ ...p, inspectionCycleDays: '' }));
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm tabular-nums text-[#17324D]"
                  />
                  {errors.inspectionCycleDays && (
                    <p className="mt-1 text-xs text-[#B42318]" role="alert">
                      {errors.inspectionCycleDays}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="asset-template"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Modelo de checklist
                  </label>
                  <select
                    id="asset-template"
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value);
                      setIsDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D]"
                  >
                    {state.templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="asset-op-status"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Estado operacional
                  </label>
                  <select
                    id="asset-op-status"
                    value={operationalStatus}
                    onChange={(e) => {
                      setOperationalStatus(e.target.value as OperationalStatus);
                      setIsDirty(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-sm text-[#17324D]"
                  >
                    <option value="active">Em operação</option>
                    <option value="maintenance">Em manutenção</option>
                    <option value="inactive">Desativado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="asset-manufacturer"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Fabricante
                  </label>
                  <input
                    id="asset-manufacturer"
                    type="text"
                    value={manufacturer}
                    onChange={(e) => {
                      setManufacturer(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ex.: Atlas Copco"
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="asset-model"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Modelo
                  </label>
                  <input
                    id="asset-model"
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ex.: GA-30"
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="asset-serial"
                    className="block text-sm font-medium text-[#17324D]"
                  >
                    Nº de série
                  </label>
                  <input
                    id="asset-serial"
                    type="text"
                    value={serialNumber}
                    onChange={(e) => {
                      setSerialNumber(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ex.: SN-88412"
                    className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 font-mono text-sm text-[#17324D]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="asset-notes"
                  className="block text-sm font-medium text-[#17324D]"
                >
                  Observações técnicas
                </label>
                <textarea
                  id="asset-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Informações úteis para inspeção e manutenção preventiva..."
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D]"
                />
              </div>

              <div className="rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#17324D]">
                      Foto do equipamento
                    </p>
                    <p className="text-xs text-[#526980]">
                      JPG, PNG ou WEBP até 5 MB (reduzida localmente para salvar no navegador).
                    </p>
                  </div>
                  <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs font-medium text-[#17324D] hover:bg-[#F4F7FA]">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{photoDataUrl ? 'Trocar foto' : 'Enviar foto'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                {photoError && (
                  <p className="mt-2 text-xs font-medium text-[#B42318]" role="alert">
                    {photoError}
                  </p>
                )}

                {photoDataUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={photoDataUrl}
                      alt="Prévia do equipamento"
                      referrerPolicy="no-referrer"
                      className="h-16 w-24 rounded border border-[#DCE4EC] object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDataUrl(undefined);
                        setIsDirty(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#B42318] hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remover foto
                    </button>
                  </div>
                )}
              </div>

              {isEditing && editingAsset && (
                <div className="flex items-center justify-between rounded-lg border border-[#DCE4EC] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#17324D]">
                      {editingAsset.operationalStatus === 'inactive'
                        ? 'Equipamento desativado'
                        : 'Desativar equipamento'}
                    </p>
                    <p className="text-xs text-[#526980]">
                      Equipamentos desativados saem das pendências, mas mantêm todo o histórico.
                    </p>
                  </div>
                  {editingAsset.operationalStatus === 'inactive' ? (
                    <button
                      type="button"
                      onClick={() => {
                        reactivateAsset(editingAsset.id);
                        onClose();
                      }}
                      className="rounded-lg border border-[#176B5B] px-3 py-1.5 text-xs font-semibold text-[#176B5B] hover:bg-[#EAF4F1] whitespace-nowrap"
                    >
                      Reativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeactivateOpen(true)}
                      className="rounded-lg border border-[#F4C7C3] bg-[#FEF3F2] px-3 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#FDE4E1] whitespace-nowrap"
                    >
                      Desativar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#DCE4EC] pt-4">
              <button
                type="button"
                onClick={requestClose}
                className="min-h-[40px] rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-sm font-medium text-[#17324D] hover:bg-[#F4F7FA]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-lg bg-[#176B5B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#125548]"
              >
                {isEditing ? 'Salvar alterações' : 'Cadastrar equipamento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Descartar alterações não salvas?"
        description="Você modificou informações deste formulário. Se fechar agora, as alterações serão perdidas."
        confirmLabel="Descartar e fechar"
        cancelLabel="Continuar editando"
        tone="danger"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeactivateOpen}
        title={`Desativar ${editingAsset?.code ?? 'equipamento'}?`}
        description="O equipamento deixará de gerar alertas de inspeção, porém todo o histórico de registros e pendências continuará preservado para consulta."
        confirmLabel="Confirmar desativação"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          if (editingAsset) {
            deactivateAsset(editingAsset.id);
          }
          setConfirmDeactivateOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmDeactivateOpen(false)}
      />
    </>
  );
};
