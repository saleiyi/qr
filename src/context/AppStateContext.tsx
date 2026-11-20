import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { APP_CONFIG } from '../config/appConfig';
import { createOperationsActions, type OperationsActions } from './operationsActions';
import { validateInspectionDraft } from '../utils/domainLogic';
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
import {
  loadAppState,
  resetAppStateStorage,
  saveAppState,
} from '../services/storageAdapter';
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

interface AppStateContextValue extends OperationsActions {
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
  ) => { ok: boolean; asset?: Asset; error?: string };
  updateAsset: (
    assetId: string,
    patch: Partial<Asset>,
  ) => { ok: boolean; error?: string };
  deactivateAsset: (assetId: string) => { ok: boolean; error?: string };
  reactivateAsset: (assetId: string) => { ok: boolean; error?: string };
  importAssetsBatch: (
    drafts: Array<Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>>,
  ) => { ok: boolean; importedCount: number; error?: string };
  submitInspection: (params: {
    assetId: string;
    templateId: string;
    inspectorId: string;
    generalNotes: string;
    answers: DraftAnswerMap;
    idempotencyKey: string;
    taskId?: string;
  }) => { ok: boolean; record?: InspectionRecord; createdIssuesCount?: number; error?: string };
  applyTemplateToCategory: (
    templateId: string,
    category: string,
  ) => { ok: boolean; updatedCount: number; error?: string };
  updateCompany: (company: CompanyProfile) => { ok: boolean; error?: string };
  addMember: (member: Omit<Member, 'id'>) => { ok: boolean; error?: string };
  updateMember: (memberId: string, patch: Partial<Member>) => { ok: boolean; error?: string };
  resetDemoData: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AppStateData>(() => loadAppState());
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    simulateLoading: false,
    simulateEmptyState: false,
    simulateStorageError: false,
    activeDemoRole: 'admin',
  });
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
    (nextState: AppStateData): { ok: boolean; error?: string } => {
      const result = saveAppState(nextState, demoSettings.simulateStorageError);
      if (!result.ok) {
        addToast({
          type: 'error',
          title: 'Erro ao salvar alterações',
          description: result.error,
        });
        return { ok: false, error: result.error };
      }
      setState(nextState);
      return { ok: true };
    },
    [demoSettings.simulateStorageError, addToast],
  );

  const setDemoRole = useCallback((role: UserRole) => {
    setDemoSettings((prev) => ({ ...prev, activeDemoRole: role }));
  }, []);

  const createAsset = useCallback(
    (draft: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>) => {
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
      const res = commitState(nextState);
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
    (assetId: string, patch: Partial<Asset>) => {
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
      const res = commitState({ ...state, assets: nextAssets });
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
    (assetId: string) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const nextAssets = state.assets.map((a) =>
        a.id === assetId
          ? { ...a, operationalStatus: 'inactive' as const, updatedAt: nowISO }
          : a,
      );
      const res = commitState({ ...state, assets: nextAssets });
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
    (assetId: string) => {
      const nowISO = APP_CONFIG.demoClockISO;
      const nextAssets = state.assets.map((a) =>
        a.id === assetId
          ? { ...a, operationalStatus: 'active' as const, updatedAt: nowISO }
          : a,
      );
      const res = commitState({ ...state, assets: nextAssets });
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
    (drafts: Array<Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>>) => {
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
      const res = commitState(nextState);
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
    (params: {
      assetId: string;
      templateId: string;
      inspectorId: string;
      generalNotes: string;
      answers: DraftAnswerMap;
      idempotencyKey: string;
      taskId?: string;
    }) => {
      const asset = state.assets.find((a) => a.id === params.assetId);
      const template = state.templates.find((t) => t.id === params.templateId);
      const inspector = state.members.find((m) => m.id === params.inspectorId);
      const task = params.taskId ? state.tasks.find(t=>t.id === params.taskId) : undefined;
      if (params.taskId && (!task || task.assetId !== params.assetId || task.templateId !== params.templateId)) return {ok:false,error:'Tarefa não encontrada para este equipamento.'};
      if (task?.status === 'completed') {
        const record=state.records.find(r=>r.id === task.recordId);
        return record?{ok:true,record,createdIssuesCount:0}:{ok:false,error:'Esta tarefa já foi concluída.'};
      }
      if (!asset || !template || !inspector) {
        return {
          ok: false,
          error: 'Dados de equipamento, modelo ou inspetor não encontrados.',
        };
      }

      if (demoSettings.activeDemoRole === 'viewer' || asset.operationalStatus === 'inactive') return {ok:false,error:'Este equipamento ou perfil permite apenas consulta.'};
      const invalid=validateInspectionDraft(template,params.answers);
      if (invalid.length) return {ok:false,error:invalid[0].message};

      // Use real time component on the demo date for clear chronological ordering within the same day
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const submittedAtISO = `${APP_CONFIG.demoClockDate}T${hh}:${mm}:${ss}-03:00`;

      const submission = buildInspectionSubmission({
        asset,
        template,
        answers: params.answers,
        inspector,
        generalNotes: params.generalNotes,
        submittedAtISO,
        idempotencyKey: params.idempotencyKey,
        existingRecords: state.records,
        existingIssues: state.issues,
      });

      if (submission.duplicateOf) {
        return {
          ok: true,
          record: submission.duplicateOf,
          createdIssuesCount: 0,
        };
      }

      if (!submission.result) {
        return { ok: false, error: 'Erro ao processar inspeção.' };
      }

      const { record, updatedAsset, createdIssues } = submission.result;
      record.taskId=task?.id;
      const nextState: AppStateData = {
        ...state,
        assets: state.assets.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)),
        records: [record, ...state.records],
        issues: [...createdIssues, ...state.issues],
        tasks: state.tasks.map(t=>t.id === task?.id ? {...t,status:'completed',completedAt:submittedAtISO,recordId:record.id}:t),
      };

      const res = commitState(nextState);
      if (!res.ok) return { ok: false, error: res.error };

      addToast({
        type: createdIssues.length > 0 ? 'info' : 'success',
        title: 'Inspeção concluída e registrada',
        description:
          createdIssues.length > 0
            ? `${createdIssues.length} pendência(s) aberta(s) automaticamente.`
            : 'Todos os itens verificados estão em conformidade.',
      });

      return {
        ok: true,
        record,
        createdIssuesCount: createdIssues.length,
      };
    },
    [state, commitState, addToast, demoSettings.activeDemoRole],
  );

  const applyTemplateToCategory = useCallback(
    (templateId: string, category: string) => {
      if (demoSettings.activeDemoRole !== 'admin' || !state.templates.some(t=>t.id === templateId)) return {ok:false,updatedCount:0,error:'Selecione um modelo publicado com perfil de administrador.'};
      let updatedCount = 0;
      const nextAssets = state.assets.map((a) => {
        if (category === 'all' || a.category === category) {
          updatedCount++;
          return { ...a, templateId, updatedAt: APP_CONFIG.demoClockISO };
        }
        return a;
      });
      const res = commitState({ ...state, assets: nextAssets });
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
    (company: CompanyProfile) => {
      const res = commitState({ ...state, company });
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
    (member: Omit<Member, 'id'>) => {
      const newMember: Member = {
        ...member,
        id: `mem-${Date.now().toString(36)}`,
      };
      const res = commitState({
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
    (memberId: string, patch: Partial<Member>) => {
      const nextMembers = state.members.map((m) =>
        m.id === memberId ? { ...m, ...patch } : m,
      );
      const res = commitState({ ...state, members: nextMembers });
      if (!res.ok) return { ok: false, error: res.error };
      addToast({
        type: 'success',
        title: 'Perfil de membro atualizado',
      });
      return { ok: true };
    },
    [state, commitState, addToast],
  );

  const resetDemoData = useCallback(() => {
    const fresh = resetAppStateStorage();
    setState(fresh);
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

  const operations=useMemo(()=>createOperationsActions(state,commitState,demoSettings.activeDemoRole,addToast),[state,commitState,demoSettings.activeDemoRole,addToast]);

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
