import { useRef, useState, useCallback } from 'react';
import { Link, useParams, useBeforeUnload, useBlocker } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, Wrench } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { processImageUpload } from '../services/storageAdapter';
import { ConfirmDialog } from './ConfirmDialog';
import { FormField, FormError, controlClass, primaryClass, secondaryClass } from './OperationsUI';
import type { IssuePriority, Issue } from '../types/domain';

export function RepairRequestForm() {
  const { id } = useParams();
  const { state, createRepairRequest, demoSettings } = useAppState();
  const asset = state.assets.find((a) => a.id === id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [reportedBy, setReportedBy] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Issue | null>(null);
  const allowLeave = useRef(false);
  const dirty =
    !result &&
    Boolean(title || description || reportedBy || photo || processing || priority !== 'medium');
  const blocker = useBlocker(useCallback(() => dirty && !allowLeave.current, [dirty]));
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty && !allowLeave.current) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty],
    ),
  );
  if (!asset || asset.operationalStatus === 'inactive' || demoSettings.activeDemoRole === 'viewer')
    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">Solicitação indisponível</h1>
        <p className="mt-3 text-sm text-[#526980]">
          Consulte a ficha do equipamento ou alterne para um perfil com permissão de operação.
        </p>
        <Link to={asset ? `/a/${asset.id}` : '/app/assets'} className={`${secondaryClass} mt-5`}>
          Voltar para a ficha
        </Link>
      </main>
    );
  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-10 text-[#17324D]">
      <header className="border-b border-[#DCE4EC] bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link to={`/a/${asset.id}`} className={`${secondaryClass} !border-0`}>
            <ArrowLeft className="h-4 w-4" />
            Ficha do equipamento
          </Link>
          <span className="rounded border border-[#DCE4EC] px-2 py-1 text-xs text-[#526980]">
            Demonstração
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
        {result ? (
          <section className="rounded-2xl border border-[#CBE4D3] bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#176B5B]" />
            <h1 className="mt-4 text-2xl font-bold">Solicitação registrada</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#526980]">
              A solicitação foi vinculada ao equipamento {asset.code} e está aguardando atribuição
              nesta demonstração.
            </p>
            <p className="mt-4 break-all rounded-lg bg-[#F4F7FA] p-3 text-xs text-[#526980]">
              Protocolo: {result.id}
            </p>
            <Link to={`/app/issues?issueId=${result.id}`} className={`${primaryClass} mt-5 w-full`}>
              Ver solicitação no painel
            </Link>
            <Link to={`/a/${asset.id}`} className={`${secondaryClass} mt-2 w-full`}>
              Voltar para a ficha
            </Link>
          </section>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#EAF4F0] p-3">
                <Wrench className="h-6 w-6 text-[#176B5B]" />
              </span>
              <div>
                <h1 className="text-2xl font-bold">Solicitar manutenção</h1>
                <p className="mt-1 text-sm text-[#526980]">
                  {asset.code} · {asset.name}
                </p>
              </div>
            </div>
            <form
              className="space-y-5 rounded-2xl border border-[#DCE4EC] bg-white p-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (processing) return;
                const saved = await createRepairRequest(asset.id, {
                  title,
                  description,
                  priority,
                  reportedBy,
                  photoDataUrl: photo,
                });
                if (saved.ok && saved.issue) setResult(saved.issue);
                else setError(saved.error ?? 'Não foi possível registrar a solicitação.');
              }}
            >
              <FormError message={error} />
              <FormField label="Título da solicitação">
                <input
                  required
                  minLength={3}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Vazamento na conexão de ar"
                  className={controlClass}
                />
              </FormField>
              <FormField label="Descreva o problema">
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="O que aconteceu e em que situação?"
                  className={controlClass}
                />
              </FormField>
              <FormField label="Prioridade">
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IssuePriority)}
                  className={controlClass}
                >
                  <option value="low">Baixa · pode ser programado</option>
                  <option value="medium">Média · precisa de avaliação</option>
                  <option value="high">Alta · operação afetada</option>
                </select>
              </FormField>
              <FormField label="Seu nome (opcional)">
                <input
                  value={reportedBy}
                  onChange={(event) => setReportedBy(event.target.value)}
                  className={controlClass}
                  autoComplete="name"
                />
              </FormField>
              <label className={`${secondaryClass} w-full cursor-pointer`}>
                <Camera className="h-4 w-4" />
                {processing ? 'Processando foto…' : 'Anexar foto do problema'}
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={processing}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setProcessing(true);
                    setError(null);
                    try {
                      const uploaded = await processImageUpload(file);
                      if (uploaded.ok) setPhoto(uploaded.dataUrl);
                      else setError(uploaded.error ?? 'Erro ao carregar foto.');
                    } catch {
                      setError('Não foi possível processar a foto. Selecione novamente.');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                />
              </label>
              <p className="!mt-2 text-xs text-[#526980]">
                JPG, PNG ou WEBP até 5 MB. A foto ajuda na avaliação do problema.
              </p>
              {photo && (
                <div>
                  <img
                    src={photo}
                    alt="Foto do problema"
                    className="max-h-60 max-w-full rounded-lg border border-[#DCE4EC] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto(undefined)}
                    className="mt-2 min-h-[40px] text-xs font-semibold text-[#B42318]"
                  >
                    Remover foto
                  </button>
                </div>
              )}
              <button type="submit" disabled={processing} className={`${primaryClass} w-full`}>
                Enviar solicitação
              </button>
              <p className="text-center text-xs leading-relaxed text-[#526980]">
                O registro fica salvo neste navegador. Nenhuma mensagem externa será enviada.
              </p>
            </form>
          </>
        )}
      </main>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Sair sem registrar a solicitação?"
        description="Os dados e fotos desta solicitação ainda não foram enviados."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar preenchendo"
        tone="danger"
        onConfirm={() => {
          allowLeave.current = true;
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
    </div>
  );
}
