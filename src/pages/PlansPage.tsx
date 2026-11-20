import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useBeforeUnload } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  List,
  Plus,
  ArrowUpRight,
  CalendarClock,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  FormField,
  FormError,
  PanelModal,
  controlClass,
  primaryClass,
  secondaryClass,
} from '../components/OperationsUI';
import { useAppState } from '../context/AppStateContext';
import { APP_CONFIG } from '../config/appConfig';
import { addDaysISODate, formatDateBR } from '../utils/date';
import type { InspectionPlan } from '../types/domain';

const frequencyLabels = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
type PlanDraft = Omit<InspectionPlan, 'id' | 'createdAt'>;
export function PlansPage() {
  const { effectiveState: state, demoSettings, savePlan } = useAppState();
  const today = APP_CONFIG.demoClockDate;
  const canPlan = demoSettings.activeDemoRole === 'admin';
  const [period, setPeriod] = useState('today');
  const [assignee, setAssignee] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState('');
  const [limit, setLimit] = useState(30);
  const [open, setOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newDraft = (): PlanDraft => ({
    name: '',
    assetIds: [],
    templateId: state.templates[0]?.id ?? '',
    assigneeId: state.members.find((m) => m.role !== 'viewer' && m.status === 'active')?.id ?? '',
    startDate: today,
    frequency: 'weekly',
  });
  const [draft, setDraft] = useState<PlanDraft>(newDraft);
  const [baseline, setBaseline] = useState('');
  const allowLeave = useRef(false);
  const dirty = open && JSON.stringify(draft) !== baseline;
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
  const [search, setSearch] = useState('');
  const assets = state.assets.filter((a) => a.operationalStatus !== 'inactive');
  const tasks = state.tasks.filter((task) =>
    state.assets.some(
      (a) =>
        a.id === task.assetId &&
        (task.status === 'completed' || a.operationalStatus !== 'inactive'),
    ),
  );
  const relevant = tasks.filter((task) => assignee === 'all' || task.assigneeId === assignee);
  const counts = {
    overdue: relevant.filter((t) => t.status === 'pending' && t.dueDate < today).length,
    today: relevant.filter((t) => t.status === 'pending' && t.dueDate === today).length,
    completed: relevant.filter((t) => t.status === 'completed').length,
  };
  const filtered = useMemo(
    () =>
      relevant
        .filter((task) => {
          if (view === 'calendar')
            return selectedDay ? task.dueDate === selectedDay : task.dueDate.startsWith(month);
          if (period === 'today')
            return task.dueDate <= today && (task.status === 'pending' || task.dueDate === today);
          if (period === 'week')
            return task.dueDate >= today && task.dueDate <= addDaysISODate(today, 6);
          if (period === 'overdue') return task.status === 'pending' && task.dueDate < today;
          if (period === 'completed') return task.status === 'completed';
          return true;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.assetId.localeCompare(b.assetId)),
    [relevant, view, selectedDay, month, period, today],
  );
  const close = () => (JSON.stringify(draft) !== baseline ? setDiscard(true) : setOpen(false));
  const startNew = () => {
    allowLeave.current = false;
    const next = newDraft();
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setError(null);
    setSearch('');
    setOpen(true);
  };
  const changeMonth = (delta: number) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
    setSelectedDay('');
  };
  const calendarDate = new Date(`${month}-01T12:00:00Z`);
  const monthDays = new Date(
    Date.UTC(calendarDate.getUTCFullYear(), calendarDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (calendarDate.getUTCDay() + 6) % 7;

  return (
    <AppShell
      title="Planos e tarefas"
      subtitle="Organize a rotina de inspeção, acompanhe prazos e registre cada execução."
      primaryAction={
        canPlan ? (
          <button onClick={startNew} className={primaryClass}>
            <Plus className="h-4 w-4" />
            Novo plano
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Para hoje', value: counts.today, key: 'today', icon: CalendarClock },
          { label: 'Tarefas atrasadas', value: counts.overdue, key: 'overdue', icon: CalendarDays },
          {
            label: 'Execuções concluídas',
            value: counts.completed,
            key: 'completed',
            icon: ClipboardCheck,
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setPeriod(item.key);
              setView('list');
              setLimit(30);
            }}
            className="flex items-center justify-between rounded-xl border border-[#DCE4EC] bg-white p-3 text-left hover:border-[#176B5B] sm:p-4"
          >
            <div>
              <p className="min-h-[32px] text-xs leading-relaxed text-[#526980] sm:min-h-0 sm:text-sm">
                {item.label}
              </p>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums ${item.key === 'overdue' && item.value ? 'text-[#B42318]' : 'text-[#17324D]'}`}
              >
                {item.value}
              </p>
            </div>
            <item.icon className="hidden h-5 w-5 text-[#176B5B] sm:block" />
          </button>
        ))}
      </div>
      <FormError message={state.scheduleWarnings?.join(' ')} />
      <section className="mt-6 overflow-hidden rounded-xl border border-[#DCE4EC] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE4EC] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-bold text-[#17324D]">Agenda da equipe</h2>
            <select
              aria-label="Responsável pelas tarefas"
              value={assignee}
              onChange={(e) => {
                setAssignee(e.target.value);
                setLimit(30);
              }}
              className={`${controlClass} !mt-0 !w-auto max-w-full`}
            >
              <option value="all">Todos os responsáveis</option>
              {state.members
                .filter((m) => m.status === 'active' && m.role !== 'viewer')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-1 rounded-lg bg-[#F4F7FA] p-1">
            {(['list', 'calendar'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={view === mode}
                onClick={() => {
                  setView(mode);
                  setLimit(30);
                }}
                className={`flex min-h-[40px] items-center gap-2 rounded-md px-3 text-sm ${view === mode ? 'bg-white font-semibold text-[#176B5B] shadow-sm' : 'text-[#526980]'}`}
              >
                {mode === 'list' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                {mode === 'list' ? 'Lista' : 'Calendário'}
              </button>
            ))}
          </div>
        </div>
        {view === 'list' ? (
          <div className="flex flex-wrap gap-2 border-b border-[#DCE4EC] p-4">
            {[
              { id: 'today', label: 'Hoje e atrasadas' },
              { id: 'week', label: 'Próximos 7 dias' },
              { id: 'all', label: 'Todas' },
              { id: 'completed', label: 'Concluídas' },
            ].map((tab) => (
              <button
                key={tab.id}
                aria-pressed={period === tab.id}
                onClick={() => {
                  setPeriod(tab.id);
                  setLimit(30);
                }}
                className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold ${period === tab.id ? 'border-[#176B5B] bg-[#EAF4F0] text-[#176B5B]' : 'border-[#DCE4EC] text-[#526980]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="border-b border-[#DCE4EC] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                onClick={() => changeMonth(-1)}
                aria-label="Mês anterior"
                className={secondaryClass}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="font-semibold capitalize">
                {calendarDate.toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                aria-label="Próximo mês"
                className={secondaryClass}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-[#DCE4EC] bg-[#DCE4EC] sm:grid">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div
                  key={day}
                  className="bg-[#F4F7FA] p-2 text-center text-xs font-medium text-[#526980]"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div key={`blank-${i}`} className="bg-[#F4F7FA]" />
              ))}
              {Array.from({ length: monthDays }, (_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, '0')}`;
                const count = relevant.filter((t) => t.dueDate === date).length;
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDay(date);
                      setLimit(30);
                    }}
                    className={`min-h-[80px] p-2 text-left align-top ${date === selectedDay ? 'bg-[#EAF4F0]' : 'bg-white hover:bg-[#F4F7FA]'}`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${date === today ? 'bg-[#176B5B] font-bold text-white' : 'text-[#526980]'}`}
                    >
                      {i + 1}
                    </span>
                    {count > 0 && (
                      <span className="mt-2 block text-xs font-semibold text-[#176B5B]">
                        {count} tarefa{count > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#526980]">
              {selectedDay
                ? `Tarefas de ${formatDateBR(selectedDay)}`
                : 'Agenda do mês, organizada por data.'}{' '}
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay('')}
                  className="ml-2 font-semibold text-[#176B5B]"
                >
                  Ver o mês inteiro
                </button>
              )}
            </p>
          </div>
        )}
        <div className="divide-y divide-[#DCE4EC]">
          {filtered.slice(0, limit).map((task) => {
            const asset = state.assets.find((a) => a.id === task.assetId)!;
            const completed = task.status === 'completed';
            const overdue = !completed && task.dueDate < today;
            return (
              <article
                key={task.id}
                data-testid="task-row"
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${completed ? 'border-[#CBE4D3] bg-[#ECF7EE] text-[#137333]' : overdue ? 'border-[#F4C7C3] bg-[#FEF3F2] text-[#B42318]' : 'border-[#DCE4EC] bg-[#F4F7FA] text-[#526980]'}`}
                    >
                      {completed
                        ? 'Concluída'
                        : overdue
                          ? 'Atrasada'
                          : task.dueDate === today
                            ? 'Para hoje'
                            : 'Programada'}
                    </span>
                    <span className="text-xs tabular-nums text-[#526980]">
                      {formatDateBR(task.dueDate)}
                    </span>
                  </div>
                  <Link
                    to={`/app/assets/${asset.id}`}
                    className="mt-2 block font-semibold text-[#17324D] hover:text-[#176B5B]"
                  >
                    {asset.code} · {asset.name}
                  </Link>
                  <p className="mt-1 break-words text-sm text-[#526980]">{task.planName}</p>
                  <p className="mt-1 text-xs text-[#526980]">
                    {state.members.find((m) => m.id === task.assigneeId)?.name} ·{' '}
                    {state.templates.find((t) => t.id === task.templateId)?.name}
                  </p>
                </div>
                {completed ? (
                  <Link
                    to={`/app/records?recordId=${task.recordId}`}
                    className={`${secondaryClass} shrink-0`}
                  >
                    Ver registro
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : demoSettings.activeDemoRole !== 'viewer' ? (
                  <Link
                    to={`/a/${asset.id}/inspect?taskId=${encodeURIComponent(task.id)}`}
                    className={`${primaryClass} shrink-0`}
                  >
                    Iniciar inspeção
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
        {!filtered.length && (
          <div className="px-5 py-14 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-[#8AA2B8]" />
            <h3 className="mt-3 font-semibold">Nenhuma tarefa neste período</h3>
            <p className="mt-2 text-sm text-[#526980]">
              Altere o período ou crie um plano para organizar a próxima inspeção.
            </p>
          </div>
        )}
        {filtered.length > limit && (
          <div className="border-t border-[#DCE4EC] p-4 text-center">
            <button onClick={() => setLimit((value) => value + 30)} className={secondaryClass}>
              Mostrar mais tarefas ({filtered.length - limit})
            </button>
          </div>
        )}
        <footer className="border-t border-[#DCE4EC] bg-[#F8FAFC] px-4 py-3 text-xs text-[#526980]">
          {filtered.length} tarefa(s) no filtro · Agenda dos últimos 30 e próximos 90 dias, com
          execuções anteriores preservadas.
        </footer>
      </section>
      <section className="mt-6">
        <h2 className="font-bold">Planos de inspeção ({state.plans.length})</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {state.plans.map((plan) => (
            <article key={plan.id} className="rounded-xl border border-[#DCE4EC] bg-white p-4">
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-2 text-sm text-[#526980]">
                {frequencyLabels[plan.frequency]} · {plan.assetIds.length} equipamento(s) · Desde{' '}
                {formatDateBR(plan.startDate)}
              </p>
            </article>
          ))}
        </div>
      </section>
      {open && (
        <PanelModal
          title="Novo plano de inspeção"
          description="Defina a rotina uma vez. Cada execução terá seu próprio registro."
          onClose={close}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await savePlan(draft);
              if (!result.ok) {
                setError(result.error ?? 'Não foi possível criar o plano.');
                return;
              }
              setOpen(false);
              setPeriod('today');
              setView('list');
            }}
            className="space-y-4"
          >
            <FormError message={error} />
            <FormField label="Nome do plano">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={controlClass}
                placeholder="Ex.: Ronda semanal da unidade"
              />
            </FormField>
            <FormField label="Modelo publicado">
              <select
                required
                value={draft.templateId}
                onChange={(e) => setDraft({ ...draft, templateId: e.target.value })}
                className={controlClass}
              >
                {state.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · v{t.version ?? 1}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Responsável pelas inspeções">
                <select
                  required
                  value={draft.assigneeId}
                  onChange={(e) => setDraft({ ...draft, assigneeId: e.target.value })}
                  className={controlClass}
                >
                  {state.members
                    .filter((m) => m.status === 'active' && m.role !== 'viewer')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Frequência">
                <select
                  value={draft.frequency}
                  onChange={(e) =>
                    setDraft({ ...draft, frequency: e.target.value as PlanDraft['frequency'] })
                  }
                  className={controlClass}
                >
                  {Object.entries(frequencyLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Primeira inspeção">
              <input
                type="date"
                required
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className={controlClass}
              />
            </FormField>
            <fieldset>
              <legend className="text-sm font-semibold">
                Equipamentos ({draft.assetIds.length} selecionados)
              </legend>
              <input
                aria-label="Buscar equipamentos do plano"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou código"
                className={controlClass}
              />
              <div className="mt-2 max-h-52 divide-y divide-[#DCE4EC] overflow-y-auto rounded-lg border border-[#DCE4EC]">
                {assets
                  .filter((a) => `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase()))
                  .map((a) => (
                    <label key={a.id} className="flex min-h-[48px] items-center gap-3 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.assetIds.includes(a.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            assetIds: e.target.checked
                              ? [...draft.assetIds, a.id]
                              : draft.assetIds.filter((id) => id !== a.id),
                          })
                        }
                        className="h-4 w-4 accent-[#176B5B]"
                      />
                      <span>
                        {a.code} · {a.name}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#DCE4EC] pt-4">
              <button type="button" onClick={close} className={secondaryClass}>
                Cancelar
              </button>
              <button type="submit" className={primaryClass}>
                Criar plano e tarefas
              </button>
            </div>
          </form>
        </PanelModal>
      )}
      <ConfirmDialog
        open={discard || blocker.state === 'blocked'}
        title="Descartar este plano?"
        description="As configurações ainda não foram salvas."
        confirmLabel="Descartar plano"
        cancelLabel="Continuar preenchendo"
        onConfirm={() => {
          allowLeave.current = true;
          setDiscard(false);
          setOpen(false);
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onCancel={() => {
          setDiscard(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
    </AppShell>
  );
}
