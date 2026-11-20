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

export function saveAppState(
  data: AppStateData,
  simulateError = false,
): StorageResult<void> {
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
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.code === 22);
    return {
      ok: false,
      error: isQuota
        ? 'Limite de armazenamento local do navegador atingido. Remova fotos antigas ou restaure os dados da demonstração.'
        : 'Não foi possível salvar os dados no navegador.',
    };
  }
}

export function resetAppStateStorage(): AppStateData {
  const seed = createInitialSeedData();
  try {
    // Clear drafts as well
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    // ignore storage errors on reset
  }
  return seed;
}

export function loadInspectionDraft(assetId: string, taskId?: string): InspectionDraft | null {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${assetId}${taskId ? `:${taskId}` : ''}`);
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
