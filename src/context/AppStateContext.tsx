import {
  persistInspection,
  type InspectionSubmissionInput,
  type InspectionSubmissionOutcome,
} from './inspectionAction';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { APP_CONFIG } from '../config/appConfig';
import { createOperationsActions, type OperationsActions } from './operationsActions';
import { validateInspectionDraft } from '../utils/domainLogic';
import { useOptionalPilot } from './PilotContext';
import { createCloudActions } from './cloudActions';
import type { PilotIdentity } from '../types/pilot';
import type {
  AppStateData,
  Asset,
  ChecklistTemplate,
  CompanyProfile,
  DemoSettings,
  InspectionRecord,
  Member,
  UserRole,
} from '../types/domain';
import { loadAppState, resetAppStateStorage, transactAppState } from '../services/storageAdapter';
import {
  buildInspectionSubmission,
  computeWorkspaceStats,
  DraftAnswerMap,
  type WorkspaceStats,
} from '../utils/domainLogic';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface AppStateContextValue extends OperationsActions {
  isPilot: boolean;
  identity?: PilotIdentity;
  state: AppStateData;
  effectiveState: AppStateData;
  stats: WorkspaceStats;
  demoSettings: DemoSettings;
  setDemoSettings: React.Dispatch<React.SetStateAction<DemoSettings>>;
  setDemoRole: (role: UserRole) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  createAsset: (
    draft: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>,
  ) => Promise<{ ok: boolean; asset?: Asset; error?: string }>;
  updateAsset: (assetId: string, patch: Partial<Asset>) => Promise<{ ok: boolean; error?: string }>;
  deactivateAsset: (assetId: string) => Promise<{ ok: boolean; error?: string }>;
  reactivateAsset: (assetId: string) => Promise<{ ok: boolean; error?: string }>;
  importAssetsBatch: (
    drafts: Array<Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>>,
  ) => Promise<{ ok: boolean; importedCount: number; error?: string }>;
  submitInspection: (params: InspectionSubmissionInput) => Promise<InspectionSubmissionOutcome>;
  applyTemplateToCategory: (
    templateId: string,
    category: string,
  ) => Promise<{ ok: boolean; updatedCount: number; error?: string }>;
  updateCompany: (company: CompanyProfile) => Promise<{ ok: boolean; error?: string }>;
  addMember: (
    member: Omit<Member, 'id'>,
  ) => Promise<{ ok: boolean; error?: string; invitationUrl?: string; expiresAt?: string }>;
  updateMember: (
    memberId: string,
    patch: Partial<Member>,
  ) => Promise<{ ok: boolean; error?: string }>;
  resetDemoData: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pilot = useOptionalPilot();
  const [demoState, setState] = useState<AppStateData>(() => pilot?.data?.state ?? loadAppState());
  const state = pilot?.data?.state ?? demoState;
  const [localDemoSettings, setDemoSettings] = useState<DemoSettings>({
    simulateLoading: false,
    simulateEmptyState: false,
    simulateStorageError: false,
    activeDemoRole: 'admin',
  });
  const demoSettings: DemoSettings = pilot?.data
    ? {
        simulateLoading: false,
        simulateEmptyState: false,
        simulateStorageError: false,
        activeDemoRole: pilot.data.identity.role,
      }
    : localDemoSettings;
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const commitState = useCallback(
    async (nextState: AppStateData): Promise<{ ok: boolean; error?: string }> => {
      if (pilot) return { ok: false, error: 'Esta alteração precisa ser confirmada pelo serviço.' };
      const result = await transactAppState(
        () => ({ next: nextState, value: undefined }),
        demoSettings.simulateStorageError,
        { value: state.revision },
      );
      if (!result.ok) {
        addToast({ type: 'error', title: 'Erro ao salvar alterações', description: result.error });
        return { ok: false, error: result.error };
      }
      setState(result.state!);
      return { ok: true };
    },
    [state, demoSettings.simulateStorageError, addToast, pilot],
  );

  const setDemoRole = useCallback((role: UserRole) => {
    setDemoSettings((prev) => ({ ...prev, activeDemoRole: role }));
  }, []);

  const createAsset = useCallback(
    async (draft: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const newAsset: Asset = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        id: `eq-${Date.now().toString(36)}`,
        files: [],
        createdAt: nowISO,
        updatedAt: nowISO,
      };
      const nextState: AppStateData = {
        ...state,
        assets: [newAsset, ...state.assets],
      };
      const res = await commitState(nextState);
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Equipamento cadastrado',
        description: `${newAsset.code} — ${newAsset.name}`,
      });
      return { ok: true, asset: newAsset };
    },
    [state, commitState, addToast],
  );

  const updateAsset = useCallback(
    async (assetId: string, patch: Partial<Asset>) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const nextAssets = state.assets.map((a) =>
        a.id === assetId
          ? {
              ...a,
              ...patch,
              code: patch.code ? patch.code.trim().toUpperCase() : a.code,
              updatedAt: nowISO,
            }
          : a,
      );
      const res = await commitState({ ...state, assets: nextAssets });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Alterações salvas',
        description: 'A ficha do equipamento foi atualizada.',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const deactivateAsset = useCallback(
    async (assetId: string) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const nextAssets = state.assets.map((a) =>
        a.id === assetId ? { ...a, operationalStatus: 'inactive' as const, updatedAt: nowISO } : a,
      );
      const res = await commitState({ ...state, assets: nextAssets });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'info',
        title: 'Equipamento desativado',
        description: 'O histórico de inspeções foi preservado.',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const reactivateAsset = useCallback(
    async (assetId: string) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const nextAssets = state.assets.map((a) =>
        a.id === assetId ? { ...a, operationalStatus: 'active' as const, updatedAt: nowISO } : a,
      );
      const res = await commitState({ ...state, assets: nextAssets });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Equipamento reativado',
        description: 'Voltou a integrar o cronograma de inspeções.',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const importAssetsBatch = useCallback(
    async (drafts: Array<Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>>) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const newAssets: Asset[] = drafts.map((d, idx) => ({
        ...d,
        code: d.code.trim().toUpperCase(),
        id: `eq-imp-${Date.now().toString(36)}-${idx}`,
        files: [],
        createdAt: nowISO,
        updatedAt: nowISO,
      }));
      const nextState: AppStateData = {
        ...state,
        assets: [...newAssets, ...state.assets],
      };
      const res = await commitState(nextState);
      if (!res.ok) return { ok: false, importedCount: 0, error: res.error };
      addToast({
        type: 'success',
        title: 'Importação concluída',
        description: `${newAssets.length} equipamento(s) adicionado(s) à lista.`,
      });
      return { ok: true, importedCount: newAssets.length };
    },
    [state, commitState, addToast],
  );

  const submitInspection = useCallback(
    async (params: InspectionSubmissionInput) => {
      const result = await persistInspection(
        params,
        demoSettings.activeDemoRole,
        demoSettings.simulateStorageError,
      );
      if (result.ok && result.state) {
        setState(result.state);
        addToast({
          type: result.alreadyCompleted ? 'info' : 'success',
          title: result.alreadyCompleted
            ? 'Tarefa já concluída em outra aba'
            : 'Inspeção concluída e registrada',
        });
      }
      return result;
    },
    [demoSettings.activeDemoRole, demoSettings.simulateStorageError, addToast],
  );

  const applyTemplateToCategory = useCallback(
    async (templateId: string, category: string) => {
      if (
        demoSettings.activeDemoRole !== 'admin' ||
        !state.templates.some((t) => t.id === templateId)
      )
        return {
          ok: false,
          updatedCount: 0,
          error: 'Selecione um modelo publicado com perfil de administrador.',
        };
      let updatedCount = 0;
      const nextAssets = state.assets.map((a) => {
        if (category === 'all' || a.category === category) {
          updatedCount++;
          return { ...a, templateId, updatedAt: APP_CONFIG.demoClockISO };
        }
        return a;
      });
      const res = await commitState({ ...state, assets: nextAssets });
      if (!res.ok) return { ok: false, updatedCount: 0, error: res.error };
      addToast({
        type: 'success',
        title: 'Modelo aplicado aos equipamentos',
        description: `${updatedCount} equipamento(s) atualizado(s).`,
      });
      return { ok: true, updatedCount };
    },
    [state, commitState, addToast, demoSettings.activeDemoRole],
  );

  const updateCompany = useCallback(
    async (company: CompanyProfile) => {
      const res = await commitState({ ...state, company });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Dados da empresa salvos',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const addMember = useCallback(
    async (member: Omit<Member, 'id'>) => {
      const newMember: Member = {
        ...member,
        id: `mem-${Date.now().toString(36)}`,
      };
      const res = await commitState({
        ...state,
        members: [...state.members, newMember],
      });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Membro adicionado localmente',
        description: 'Salvo nesta demonstração; nenhum e-mail de convite foi enviado.',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const updateMember = useCallback(
    async (memberId: string, patch: Partial<Member>) => {
      const nextMembers = state.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m));
      const res = await commitState({ ...state, members: nextMembers });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Perfil de membro atualizado',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const resetDemoData = useCallback(async () => {
    const result = await resetAppStateStorage();
    if (!result.ok || !result.data) {
      addToast({ type: 'error', title: 'Falha ao restaurar dados', description: result.error });
      return;
    }
    setState(result.data);
    setDemoSettings({
      simulateLoading: false,
      simulateEmptyState: false,
      simulateStorageError: false,
      activeDemoRole: 'admin',
    });
    addToast({
      type: 'info',
      title: 'Dados da demonstração restaurados',
      description: 'Base inicial de 26 equipamentos e histórico restabelecida.',
    });
  }, [addToast]);

  const effectiveState = useMemo<AppStateData>(() => {
    if (demoSettings.simulateEmptyState) {
      return {
        ...state,
        assets: [],
        records: [],
        issues: [],
        plans: [],
        tasks: [],
        templateDrafts: [],
      };
    }
    return state;
  }, [state, demoSettings.simulateEmptyState]);

  const stats = useMemo(
    () =>
      computeWorkspaceStats(
        effectiveState.assets,
        effectiveState.records,
        effectiveState.issues,
        APP_CONFIG.demoClockDate,
      ),
    [effectiveState],
  );

  const operations = useMemo(
    () => createOperationsActions(state, commitState, demoSettings.activeDemoRole, addToast),
    [state, commitState, demoSettings.activeDemoRole, addToast],
  );

  const cloudActions = useMemo(
    () => (pilot?.data ? createCloudActions(pilot, pilot.data.identity, addToast) : null),
    [pilot, addToast],
  );

  return (
    <AppStateContext.Provider
      value={{
        ...operations,
        state,
        effectiveState,
        stats,
        demoSettings,
        setDemoSettings,
        setDemoRole,
        toasts,
        addToast,
        dismissToast,
        createAsset,
        updateAsset,
        deactivateAsset,
        reactivateAsset,
        importAssetsBatch,
        submitInspection,
        applyTemplateToCategory,
        updateCompany,
        addMember,
        updateMember,
        resetDemoData,
        ...cloudActions,
        isPilot: Boolean(pilot),
        identity: pilot?.data?.identity,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState deve ser utilizado dentro de AppStateProvider.');
  }
  return ctx;
}
