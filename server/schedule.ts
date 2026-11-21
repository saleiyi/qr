import type { AppStateData, InspectionPlan } from '../src/types/domain';
import { addDaysISODate, diffDays } from '../src/utils/date';
import { generatePlanTasks } from '../src/utils/operations';
import { calendarDay, Failure } from './common';

const maxTasks = 30_000;
const incomplete =
  'Agenda parcial. São exibidas as tarefas já salvas. A geração de recorrências atingiu o limite do piloto.';
type ScheduleData = Pick<AppStateData, 'plans' | 'tasks'>;

// Count anchored occurrences without allocating a task object for each asset.
function occurrencesThrough(plan: InspectionPlan, day: string) {
  if (day < plan.startDate) return 0;
  if (plan.frequency !== 'monthly')
    return 1 + Math.floor(diffDays(day, plan.startDate) / (plan.frequency === 'weekly' ? 7 : 1));
  const end = new Date(day + 'T12:00:00Z');
  const start = new Date(plan.startDate + 'T12:00:00Z');
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  const last = new Date(end);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return months + Number(end.getUTCDate() >= Math.min(start.getUTCDate(), last.getUTCDate()));
}
function bounds(plan: InspectionPlan, timezone: string) {
  const initialFloor = addDaysISODate(calendarDay(plan.createdAt, timezone), -30);
  return initialFloor > plan.startDate ? initialFloor : plan.startDate;
}
function hasCapacity(data: ScheduleData, today: string, timezone: string) {
  if (data.tasks.length > maxTasks) return false;
  const horizon = addDaysISODate(today, 90);
  const earliest = addDaysISODate(today, -3660);
  const floors = new Map<string, string>();
  let count = 0;
  for (const plan of data.plans) {
    const from = bounds(plan, timezone);
    if (from < earliest) return false;
    floors.set(plan.id, from);
    count +=
      Math.max(
        0,
        occurrencesThrough(plan, horizon) - occurrencesThrough(plan, addDaysISODate(from, -1)),
      ) * plan.assetIds.length;
    if (count > maxTasks) return false;
  }
  for (const task of data.tasks) {
    const floor = floors.get(task.planId);
    if (!floor || task.dueDate < floor || task.dueDate > horizon) count++;
    if (count > maxTasks) return false;
  }
  return true;
}
export function projectSchedule(
  state: AppStateData,
  today: string,
  timezone: string,
): string | undefined {
  if (!hasCapacity(state, today, timezone)) return incomplete;
  const horizon = addDaysISODate(today, 90);
  const stored = new Set(state.tasks.map((task) => task.id));
  for (const plan of state.plans) {
    let from = bounds(plan, timezone);
    while (from <= horizon) {
      const end = addDaysISODate(from, 119);
      const through = end < horizon ? end : horizon;
      for (const task of generatePlanTasks(plan, through, [], from)) {
        if (!stored.has(task.id)) state.tasks.push(task);
      }
      from = addDaysISODate(through, 1);
    }
  }
}
export function admitPlan(
  state: AppStateData,
  plan: InspectionPlan,
  today: string,
  timezone: string,
) {
  const future = addDaysISODate(today, 365);
  if (
    state.scheduleWarnings?.length ||
    !hasCapacity({ plans: [...state.plans, plan], tasks: state.tasks }, future, timezone)
  )
    throw new Failure(
      422,
      'SCHEDULE_CAPACITY',
      'Este plano excede a capacidade de agendamento do piloto para os próximos 12 meses. Reduza os equipamentos ou a frequência.',
    );
}
