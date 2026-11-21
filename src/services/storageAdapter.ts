import type { AppStateData, InspectionDraft } from '../types/domain';
import { createInitialSeedData } from '../data/seedData';
import { normalizeOperationsState } from '../utils/operations';

const STORAGE_KEY = 'ativos_demo_state_v1';
const DRAFT_PREFIX = 'ativos_demo_draft_v1_';

export interface StorageResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function loadAppState(): AppStateData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createInitialSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as AppStateData;
    if (!parsed || !Array.isArray(parsed.assets) || !Array.isArray(parsed.templates)) {
      const seed = createInitialSeedData();
      return seed;
    }
    return normalizeOperationsState(parsed);
  } catch {
    return createInitialSeedData();
  }
}

export function saveAppState(data: AppStateData, simulateError = false): StorageResult<void> {
  if (simulateError) {
    return {
      ok: false,
      error:
        'Falha simulada ao gravar no armazenamento local do navegador. As alterações não foram salvas.',
    };
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    const isQuota =
      err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    return {
      ok: false,
      error: isQuota
        ? 'Limite de armazenamento local do navegador atingido. Remova fotos antigas ou restaure os dados da demonstração.'
        : 'Não foi possível salvar os dados no navegador.',
    };
  }
}

export async function transactAppState<T>(
  change: (current: AppStateData) => { next?: AppStateData; value: T },
  simulateError = false,
  expectedRevision?: { value: string | undefined },
): Promise<StorageResult<T> & { state?: AppStateData }> {
  // Every writer cooperates on the same origin-wide lock; no read/write gap spans an await.
  if (!navigator.locks)
    return {
      ok: false,
      error: 'Abra a demonstração em HTTPS ou localhost para salvar com segurança entre abas.',
    };
  try {
    return await navigator.locks.request(STORAGE_KEY, () => {
      const current = loadAppState();
      if (expectedRevision && current.revision !== expectedRevision.value) {
        return {
          ok: false,
          error:
            'Outra aba atualizou os dados. Nada foi sobrescrito. Mantenha esta tela aberta e copie suas alterações antes de reabrir a página.',
        };
      }
      const result = change(current);
      if (!result.next) return { ok: true, data: result.value, state: current };
      const next = { ...result.next, revision: crypto.randomUUID() };
      const saved = saveAppState(next, simulateError);
      return saved.ok
        ? { ok: true, data: result.value, state: next }
        : { ok: false, error: saved.error };
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Não foi possível salvar os dados.',
    };
  }
}

export async function resetAppStateStorage(): Promise<StorageResult<AppStateData>> {
  const seed = createInitialSeedData();
  const saved = await transactAppState(() => ({ next: seed, value: seed }));
  if (saved.ok) {
    // Clear drafts as well
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    return { ok: true, data: saved.state };
  }
  return { ok: false, error: saved.error };
}

export function loadInspectionDraft(assetId: string, taskId?: string): InspectionDraft | null {
  try {
    const raw = window.localStorage.getItem(
      `${DRAFT_PREFIX}${assetId}${taskId ? `:${taskId}` : ''}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as InspectionDraft;
  } catch {
    return null;
  }
}

export function saveInspectionDraft(
  draft: InspectionDraft,
  simulateError = false,
): StorageResult<void> {
  if (simulateError) {
    return {
      ok: false,
      error: 'Falha simulada ao salvar rascunho no armazenamento local.',
    };
  }
  try {
    const existing = loadInspectionDraft(draft.assetId, draft.taskId);
    if (
      existing &&
      (existing.templateId !== draft.templateId ||
        (existing.templateVersion ?? 1) !== (draft.templateVersion ?? 1) ||
        (existing.questionSnapshot &&
          JSON.stringify(existing.questionSnapshot) !== JSON.stringify(draft.questionSnapshot)))
    ) {
      const archiveKey = `${DRAFT_PREFIX}archive:${draft.assetId}:${draft.taskId ?? 'adhoc'}:${existing.templateId}:${existing.updatedAt}`;
      window.localStorage.setItem(archiveKey, JSON.stringify(existing));
    }
    window.localStorage.setItem(
      `${DRAFT_PREFIX}${draft.assetId}${draft.taskId ? `:${draft.taskId}` : ''}`,
      JSON.stringify(draft),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Espaço insuficiente no navegador para salvar o rascunho com anexos.',
    };
  }
}

export function loadArchivedDrafts(assetId: string, taskId?: string): InspectionDraft[] {
  const drafts: InspectionDraft[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(`${DRAFT_PREFIX}archive:`)) continue;
      const value = JSON.parse(localStorage.getItem(key)!) as InspectionDraft;
      if (value.assetId === assetId && value.taskId === taskId) drafts.push(value);
    }
  } catch {
    /* A failed recovery read does not overwrite the current draft. */
  }
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function clearInspectionDraft(assetId: string, taskId?: string): void {
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${assetId}${taskId ? `:${taskId}` : ''}`);
  } catch {
    // ignore
  }
}

/**
 * Validates and compresses an uploaded image file so localStorage stays healthy.
 * Accepts JPEG, PNG, or WEBP up to 5 MB.
 */
export async function processImageUpload(
  file: File,
  maxBytes = 5 * 1024 * 1024,
): Promise<{ ok: boolean; dataUrl?: string; error?: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: 'Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.',
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      error: 'Arquivo muito grande. O limite máximo é de 5 MB por imagem.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () =>
      resolve({ ok: false, error: 'Não foi possível ler o arquivo selecionado.' });
    reader.onload = () => {
      const originalDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () =>
        resolve({ ok: false, error: 'Arquivo de imagem inválido ou corrompido.' });
      img.onload = () => {
        const maxDim = 720;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ ok: true, dataUrl: originalDataUrl });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.72);
        resolve({ ok: true, dataUrl: compressed });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
