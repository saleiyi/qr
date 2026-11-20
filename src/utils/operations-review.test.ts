import test from 'node:test';
import assert from 'node:assert/strict';
import { materializePlanTasks, transitionWorkOrder } from './operations';
import { reconcileInspectionDraft } from './checklist';
import type { ChecklistTemplate, InspectionDraft, InspectionPlan, Issue } from '../types/domain';

test('materialization uses the same bounded window for an old plan on creation and reload', () => {
  const plan: InspectionPlan = {
    id: 'old',
    name: 'Plano antigo',
    assetIds: ['a'],
    templateId: 't',
    assigneeId: 'm',
    startDate: '2000-01-01',
    frequency: 'daily',
    createdAt: 'now',
  };
  const tasks = materializePlanTasks(plan, '2026-11-20');
  assert.ok(tasks.some((task) => task.dueDate === '2026-11-20'));
  assert.ok(tasks.length <= 121);
  assert.deepEqual(materializePlanTasks(plan, '2026-11-20', tasks), tasks);
});

test('reconciliation invalidates changed questions and cloned template identities', () => {
  const question = {
    id: 'q',
    section: 'Geral',
    label: 'Pergunta antiga',
    type: 'check' as const,
    required: true,
    photoRequired: false,
  };
  const saved: InspectionDraft = {
    assetId: 'a',
    templateId: 't',
    templateVersion: 1,
    questionSnapshot: [question],
    inspectorId: 'm',
    generalNotes: 'Notas preservadas',
    updatedAt: 'now',
    answers: { q: { status: 'conforming', photoDataUrl: 'photo-A' } },
  };
  const revised: ChecklistTemplate = {
    id: 't',
    version: 2,
    name: 'Modelo',
    category: 'Geral',
    description: '',
    updatedAt: 'now',
    items: [{ ...question, label: 'Pergunta nova' }],
  };
  assert.deepEqual(reconcileInspectionDraft(saved, revised).answers, {});
  assert.deepEqual(
    reconcileInspectionDraft(saved, { ...revised, id: 'clone', items: [question] }).answers,
    {},
  );
  assert.equal(saved.answers.q.photoDataUrl, 'photo-A');
});

test('each treatment submission preserves its photos and assignment snapshot', () => {
  const issue: Issue = {
    id: 'i',
    assetId: 'a',
    title: 'Reparo',
    description: 'Descrição',
    status: 'open',
    priority: 'high',
    assigneeId: '',
    dueDate: '2026-11-20',
    createdAt: 'now',
    updatedAt: 'now',
  };
  const assigned = transitionWorkOrder(
    issue,
    'assign',
    { actorId: 'admin', assigneeId: 'tech', dueDate: '2026-11-25', priority: 'medium' },
    'now',
  );
  const active = transitionWorkOrder(assigned, 'start', { actorId: 'tech' }, 'now');
  const first = transitionWorkOrder(
    active,
    'submit',
    { actorId: 'tech', note: 'Primeiro reparo', photoDataUrl: 'photo-A' },
    'now',
  );
  const returned = transitionWorkOrder(
    first,
    'reject',
    { actorId: 'admin', note: 'Ajustar novamente' },
    'now',
  );
  const second = transitionWorkOrder(
    returned,
    'submit',
    { actorId: 'tech', note: 'Segundo reparo', photoDataUrl: 'photo-B' },
    'now',
  );
  assert.ok(second.timeline?.some((event) => event.photoDataUrl === 'photo-A'));
  assert.ok(second.timeline?.some((event) => event.photoDataUrl === 'photo-B'));
  assert.equal(second.timeline?.[0].assigneeId, 'tech');
  assert.equal(second.timeline?.[0].dueDate, '2026-11-25');
  assert.equal(second.timeline?.[0].priority, 'medium');
});
