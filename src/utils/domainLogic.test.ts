import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInspectionSubmission,
  computeAssetInspectionStatus,
  computeWorkspaceStats,
  filterAssets,
  resolveIssueWithOutcome,
  validateAssetInput,
  validateInspectionDraft,
} from './domainLogic';
import { formatDateBR, diffDays, addDaysISODate } from './date';
import { validateCsvAssetImport } from './csv';
import type { Asset, ChecklistTemplate, Issue, Member, Site } from '../types/domain';

const REF_DATE = '2026-11-20';

const sampleSite: Site = {
  id: 'site-1',
  name: 'Unidade Industrial Campinas',
  city: 'Campinas - SP',
  address: 'Av. das Indústrias, 420',
};

const sampleMember: Member = {
  id: 'mem-1',
  name: 'Carlos Eduardo Silva',
  role: 'admin',
  jobTitle: 'Coordenador de Manutenção',
  email: 'carlos@valeverde.ind.br',
  status: 'active',
};

const sampleTemplate: ChecklistTemplate = {
  id: 'tpl-1',
  name: 'Inspeção Geral',
  category: 'Geral',
  description: 'Checklist padrão',
  updatedAt: '2026-11-01T10:00:00-03:00',
  items: [
    {
      id: 'item-1',
      section: 'Segurança',
      label: 'Proteções mecânicas íntegras',
      type: 'check',
      required: true,
      photoRequired: false,
    },
    {
      id: 'item-2',
      section: 'Operação',
      label: 'Pressão de trabalho',
      type: 'number',
      unit: 'bar',
      required: true,
      photoRequired: false,
    },
  ],
};

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'eq-1',
    code: 'EQ-001',
    name: 'Compressor Principal',
    category: 'Compressores',
    siteId: 'site-1',
    sector: 'Utilidades',
    assigneeId: 'mem-1',
    operationalStatus: 'active',
    inspectionCycleDays: 30,
    templateId: 'tpl-1',
    lastInspectionAt: '2026-10-15T10:00:00-03:00',
    nextInspectionDue: '2026-11-14',
    manufacturer: 'Atlas Copco',
    model: 'GA-22',
    serialNumber: 'SN-1001',
    notes: '',
    files: [],
    createdAt: '2026-01-10T09:00:00-03:00',
    updatedAt: '2026-10-15T10:00:00-03:00',
    ...overrides,
  };
}

test('date helpers format DD/MM/AAAA and compute calendar deltas deterministically', () => {
  assert.equal(formatDateBR('2026-11-20T10:30:00-03:00'), '20/11/2026');
  assert.equal(diffDays('2026-11-14', REF_DATE), -6);
  assert.equal(addDaysISODate('2026-11-20', 30), '2026-12-20');
});

test('computeAssetInspectionStatus separates overdue, due_soon, ok, never_inspected, and inactive', () => {
  assert.equal(computeAssetInspectionStatus(makeAsset({ nextInspectionDue: '2026-11-19' }), REF_DATE), 'overdue');
  assert.equal(computeAssetInspectionStatus(makeAsset({ nextInspectionDue: '2026-11-25' }), REF_DATE), 'due_soon');
  assert.equal(computeAssetInspectionStatus(makeAsset({ nextInspectionDue: '2026-12-10' }), REF_DATE), 'ok');
  assert.equal(
    computeAssetInspectionStatus(makeAsset({ lastInspectionAt: null, nextInspectionDue: null }), REF_DATE),
    'never_inspected',
  );
  assert.equal(
    computeAssetInspectionStatus(makeAsset({ operationalStatus: 'inactive', nextInspectionDue: '2026-01-01' }), REF_DATE),
    'inactive',
  );
});

test('computeWorkspaceStats matches filtered asset counts', () => {
  const assets = [
    makeAsset({ id: 'eq-1', code: 'EQ-001', nextInspectionDue: '2026-11-10' }), // overdue
    makeAsset({ id: 'eq-2', code: 'EQ-002', nextInspectionDue: '2026-11-23' }), // due_soon
    makeAsset({ id: 'eq-3', code: 'EQ-003', nextInspectionDue: '2026-12-15' }), // ok
    makeAsset({ id: 'eq-4', code: 'EQ-004', operationalStatus: 'inactive', nextInspectionDue: '2026-01-01' }), // inactive
  ];

  const stats = computeWorkspaceStats(assets, [], [], REF_DATE);
  assert.equal(stats.overdueCount, 1);
  assert.equal(stats.dueSoonCount, 1);
  assert.equal(stats.okCount, 1);
  assert.equal(stats.inactiveAssets, 1);

  const overdueFiltered = filterAssets(
    assets,
    { search: '', siteId: 'all', category: 'all', inspectionStatus: 'overdue', operationalStatus: 'all' },
    REF_DATE,
  );
  assert.equal(overdueFiltered.length, stats.overdueCount);
  assert.equal(overdueFiltered[0].id, 'eq-1');
});

test('validateAssetInput rejects duplicate codes and missing required fields', () => {
  const existing = [makeAsset({ id: 'eq-1', code: 'EQ-001' })];
  const dupErrors = validateAssetInput(
    { name: 'Novo Equipamento', code: 'eq-001', siteId: 'site-1', assigneeId: 'mem-1', inspectionCycleDays: 30 },
    existing,
  );
  assert.ok(dupErrors.code);

  const sameRecordOk = validateAssetInput(
    { name: 'Compressor Editado', code: 'EQ-001', siteId: 'site-1', assigneeId: 'mem-1', inspectionCycleDays: 30 },
    existing,
    'eq-1',
  );
  assert.equal(Object.keys(sameRecordOk).length, 0);
});

test('inspection validation requires explicit selection and non-conforming description', () => {
  const emptyErrors = validateInspectionDraft(sampleTemplate, {});
  assert.equal(emptyErrors.length, 2);

  const failWithoutNote = validateInspectionDraft(sampleTemplate, {
    'item-1': { status: 'non_conforming', note: '' },
    'item-2': { status: 'conforming', numericValue: '7.5' },
  });
  assert.equal(failWithoutNote.length, 1);
  assert.equal(failWithoutNote[0].itemId, 'item-1');
});

test('buildInspectionSubmission updates dates, creates issue on non_conforming, and prevents duplicate submission', () => {
  const asset = makeAsset({ id: 'eq-1', inspectionCycleDays: 30 });
  const answers = {
    'item-1': { status: 'non_conforming' as const, note: 'Grade lateral solta' },
    'item-2': { status: 'conforming' as const, numericValue: '7.8' },
  };

  const first = buildInspectionSubmission({
    asset,
    template: sampleTemplate,
    answers,
    inspector: sampleMember,
    generalNotes: 'Necessário aperto urgente.',
    submittedAtISO: '2026-11-20T11:00:00-03:00',
    idempotencyKey: 'key-123',
    existingRecords: [],
    existingIssues: [],
  });

  assert.ok(first.result);
  assert.equal(first.result.record.overallResult, 'with_issues');
  assert.equal(first.result.updatedAsset.nextInspectionDue, '2026-12-20');
  assert.equal(first.result.createdIssues.length, 1);
  assert.equal(first.result.createdIssues[0].status, 'open');

  // Re-submitting with same idempotencyKey returns duplicateOf instead of creating a second record
  const second = buildInspectionSubmission({
    asset,
    template: sampleTemplate,
    answers,
    inspector: sampleMember,
    generalNotes: 'Necessário aperto urgente.',
    submittedAtISO: '2026-11-20T11:00:05-03:00',
    idempotencyKey: 'key-123',
    existingRecords: [first.result.record],
    existingIssues: first.result.createdIssues,
  });

  assert.ok(second.duplicateOf);
  assert.equal(second.result, undefined);
});

test('resolveIssueWithOutcome requires meaningful resolution notes', () => {
  const issue: Issue = {
    id: 'iss-1',
    assetId: 'eq-1',
    inspectionId: 'insp-1',
    itemId: 'item-1',
    title: 'Vazamento na linha',
    description: 'Pequeno gotejamento',
    priority: 'high',
    status: 'open',
    assigneeId: 'mem-1',
    dueDate: '2026-11-23',
    createdAt: '2026-11-20T10:00:00-03:00',
    updatedAt: '2026-11-20T10:00:00-03:00',
  };

  const fail = resolveIssueWithOutcome(issue, 'ok', 'mem-1', '2026-11-20T12:00:00-03:00');
  assert.ok(fail.error);

  const success = resolveIssueWithOutcome(
    issue,
    'Substituída a conexão e testada estanqueidade.',
    'mem-1',
    '2026-11-20T12:00:00-03:00',
  );
  assert.equal(success.updatedIssue?.status, 'resolved');
  assert.ok(success.updatedIssue?.resolvedAt);
});

test('validateCsvAssetImport catches row errors while allowing valid rows', () => {
  const csv = [
    'codigo,nome,categoria,local,responsavel,ciclo_dias,status_operacional,modelo,numero_serie,observacoes',
    'EQ-099,Gerador Auxiliar,Energia,Unidade Industrial Campinas,Carlos Eduardo Silva,30,active,Stemac 100kVA,SN-99,OK',
    'EQ-001,Duplicado Existente,Energia,Unidade Industrial Campinas,Carlos Eduardo Silva,30,active,X,Y,Z',
    'EQ-100,,CategoriaInexistente,LocalInvalido,Ninguém,0,active,X,Y,Z',
  ].join('\n');

  const res = validateCsvAssetImport(csv, {
    existingAssets: [makeAsset({ code: 'EQ-001' })],
    sites: [sampleSite],
    members: [sampleMember],
    templates: [sampleTemplate],
  });

  assert.equal(res.headerError, undefined);
  assert.equal(res.validCount, 1);
  assert.equal(res.errorCount, 2);
  assert.equal(res.rows[0].errors.length, 0);
  assert.ok(res.rows[1].errors[0].includes('já cadastrado'));
  assert.ok(res.rows[2].errors.length >= 3);
});
