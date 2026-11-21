import { useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useOptionalPilot } from '../context/PilotContext';
import { ConfirmDialog } from './ConfirmDialog';

export function PilotAccount() {
  const pilot = useOptionalPilot();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pilot?.data) return null;
  const identity = pilot.data.identity;
  const role = { admin: 'Administrador', operator: 'Operador', viewer: 'Visualizador' }[
    identity.role
  ];
  return (
    <div className="rounded-lg border border-[#294968] bg-[#1A354E] p-3 text-sm text-white">
      <p className="font-semibold">{identity.name}</p>
      <p className="mt-1 text-[#CBD7E4]">{role}</p>
      <p className="mt-1 break-all text-xs leading-relaxed text-[#9FB5CA]">{identity.email}</p>
      <button
        type="button"
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#345678] px-3 text-sm font-semibold hover:bg-[#234463]"
        onClick={() => setConfirming(true)}
      >
        <LogOut className="h-4 w-4" />
        Sair da conta
      </button>
      <ConfirmDialog
        open={confirming}
        title="Sair da sua conta?"
        description="Os registros enviados continuam salvos na empresa. Os rascunhos ainda não enviados serão removidos deste navegador."
        confirmLabel="Sair"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await pilot.logout();
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Não foi possível sair.');
          }
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#FECACA]">
          {error}
        </p>
      )}
    </div>
  );
}

export function PilotSyncBar() {
  const pilot = useOptionalPilot();
  if (!pilot?.data) return null;
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE4EC] bg-white px-4 py-2 text-xs text-[#526980] sm:px-6 lg:px-8">
      <span role={pilot.error ? 'alert' : 'status'} className={pilot.error ? 'text-[#9C2A20]' : ''}>
        {pilot.error ??
          (pilot.editing
            ? 'Edição em andamento · atualização automática pausada'
            : pilot.lastSyncAt
              ? `Atualizado às ${pilot.lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Conectado à empresa')}
      </span>
      <button
        type="button"
        onClick={() => void pilot.refresh()}
        disabled={pilot.refreshing || pilot.editing}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold text-[#176B5B] hover:bg-[#EEF7F2] disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${pilot.refreshing ? 'animate-spin' : ''}`} />
        Atualizar registros
      </button>
    </div>
  );
}
