import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { isWorkspaceResponse, PilotHttpError, pilotApi } from '../services/pilotClient';
import { configurePilotClock } from '../services/runtimeMode';
import { configurePilotDraftScope, clearPilotDrafts } from '../services/storageAdapter';
import type { PilotCommand, PilotCommandResponse, PilotWorkspaceResponse } from '../types/pilot';

interface PilotContextValue {
  data: PilotWorkspaceResponse | null;
  status: 'loading' | 'ready' | 'unauthenticated' | 'error';
  error: string | null;
  refreshing: boolean;
  lastSyncAt: Date | null;
  editing: boolean;
  refresh: () => Promise<void>;
  execute: (command: PilotCommand, revision?: string) => Promise<PilotCommandResponse>;
  logout: () => Promise<void>;
  completeEditing: (command?: string) => void;
  beginEditing: (element: HTMLElement) => void;
}
const PilotContext = createContext<PilotContextValue | null>(null);

export function PilotProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PilotWorkspaceResponse | null>(null);
  const [status, setStatus] = useState<PilotContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
  const editingForm = useRef<HTMLElement | null>(null);
  const editRevision = useRef<string | undefined>(undefined);
  const dataRef = useRef<PilotWorkspaceResponse | null>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const receive = useCallback((next: PilotWorkspaceResponse) => {
    if (!isWorkspaceResponse(next))
      throw new PilotHttpError(
        502,
        'SERVER_ERROR',
        'O serviço retornou dados incompletos. Tente novamente.',
      );
    if (!mounted.current) return;
    configurePilotDraftScope(next.identity);
    configurePilotClock(next);
    dataRef.current = next;
    setData(next);
    setStatus('ready');
    setError(null);
    setLastSyncAt(new Date());
  }, []);

  const failed = useCallback((reason: unknown) => {
    if (!mounted.current) return;
    const message =
      reason instanceof Error ? reason.message : 'Não foi possível acessar o serviço.';
    if (
      reason instanceof PilotHttpError &&
      (reason.status === 401 ||
        reason.code === 'SESSION_CHANGED' ||
        reason.code === 'MEMBERSHIP_INACTIVE')
    ) {
      if (reason.code === 'SESSION_CHANGED' || reason.code === 'MEMBERSHIP_INACTIVE') {
        clearPilotDrafts();
        configurePilotDraftScope(null);
      }
      setStatus('unauthenticated');
      setData(null);
      dataRef.current = null;
      configurePilotClock(null);
    } else if (!dataRef.current) setStatus('error');
    setError(message);
  }, []);

  const completeEditing = useCallback((command?: string) => {
    const formCommand = editingForm.current?.dataset.cloudCommand;
    if (
      !editingForm.current?.isConnected ||
      !formCommand ||
      !command ||
      formCommand.split(' ').some((name) => command === name || command.startsWith(`${name}.`))
    ) {
      editingForm.current = null;
      editRevision.current = undefined;
      setEditing(false);
    }
  }, []);

  const beginEditing = useCallback((element: HTMLElement) => {
    if (editingForm.current?.isConnected) return;
    editingForm.current = element;
    generation.current += 1;
    editRevision.current = dataRef.current?.state.revision;
    setEditing(true);
  }, []);

  useEffect(() => {
    if (editingForm.current && !editingForm.current.isConnected) completeEditing();
  }, [location.pathname, completeEditing]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    if (editingForm.current?.isConnected) return;
    inFlight.current = true;
    const requestGeneration = generation.current;
    setRefreshing(true);
    try {
      const response = await pilotApi.workspace();
      if (requestGeneration === generation.current && !editingForm.current?.isConnected)
        receive(response);
    } catch (reason) {
      if (requestGeneration === generation.current) failed(reason);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [receive, failed]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const refreshWhenIdle = () => {
      // A refresh may replace an edited entity; preserve forms until their save/exit.
      if (
        document.visibilityState !== 'visible' ||
        /\/(inspect|request)$/.test(locationRef.current)
      )
        return;
      if (editingForm.current?.isConnected) return;
      if (editingForm.current) {
        editingForm.current = null;
        editRevision.current = undefined;
        setEditing(false);
      }
      if (
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"], input:focus, textarea:focus, select:focus',
        )
      )
        return;
      void refresh();
    };
    const timer = window.setInterval(refreshWhenIdle, 15_000);
    const markEditing = (event: Event) => {
      const target = event.target;
      const form =
        target instanceof HTMLElement
          ? target.closest<HTMLElement>('form, [data-cloud-editor]')
          : null;
      if (form) beginEditing(form);
    };
    document.addEventListener('input', markEditing);
    document.addEventListener('change', markEditing);
    window.addEventListener('focus', refreshWhenIdle);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenIdle);
      document.removeEventListener('input', markEditing);
      document.removeEventListener('change', markEditing);
      configurePilotClock(null);
    };
  }, [refresh, beginEditing]);

  const execute = useCallback(
    async (command: PilotCommand, revision?: string) => {
      const current = dataRef.current;
      if (!current)
        throw new PilotHttpError(401, 'UNAUTHENTICATED', 'Entre novamente para continuar.');
      const requestGeneration = ++generation.current;
      try {
        const response = await pilotApi.command(
          current.identity.workspaceId,
          command,
          editRevision.current ?? revision ?? current.state.revision,
        );
        completeEditing(command.type);
        if (requestGeneration === generation.current) receive(response);
        return response;
      } catch (reason) {
        if (requestGeneration === generation.current) failed(reason);
        throw reason;
      }
    },
    [receive, failed, completeEditing],
  );

  const logout = useCallback(async () => {
    generation.current += 1;
    await pilotApi.logout();
    clearPilotDrafts();
    configurePilotDraftScope(null);
    configurePilotClock(null);
    dataRef.current = null;
    setData(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <PilotContext.Provider
      value={{
        data,
        status,
        error,
        refreshing,
        lastSyncAt,
        editing,
        refresh,
        execute,
        logout,
        completeEditing,
        beginEditing,
      }}
    >
      {children}
    </PilotContext.Provider>
  );
}

export function useOptionalPilot() {
  return useContext(PilotContext);
}
