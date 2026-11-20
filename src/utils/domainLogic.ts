import { APP_CONFIG } from '../config/appConfig';
import type {
  Asset,
  AssetFilterState,
  ChecklistAnswerValue,
  ChecklistTemplate,
  InspectionAnswer,
  InspectionRecord,
  InspectionScheduleStatus,
  Issue,
  Member,
} from '../types/domain';
import { addDaysISODate, diffDays } from './date';

export function computeAssetInspectionStatus(
  asset: Asset,
  referenceDate: string = APP_CONFIG.demoClockDate,
  dueSoonDays: number = APP_CONFIG.dueSoonWindowDays,
): InspectionScheduleStatus {
  if (asset.operationalStatus === 'inactive') {
    return 'inactive';
  }
  if (!asset.lastInspectionAt || !asset.nextInspectionDue) {
    return 'never_inspected';
  }
  const daysRemaining = diffDays(asset.nextInspectionDue, referenceDate);
  if (daysRemaining < 0) {
    return 'overdue';
  }
  if (daysRemaining <= dueSoonDays) {
    return 'due_soon';
  }
  return 'ok';
}

export interface WorkspaceStats {
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  overdueCount: number;
  dueSoonCount: number;
  neverInspectedCount: number;
  okCount: number;
  openIssuesCount: number;
  inProgressIssuesCount: number;
  unresolvedIssuesCount: number;
  totalRecordsCount: number;
  recentApprovedCount: number;
}

export function computeWorkspaceStats(
  assets: Asset[],
  records: InspectionRecord[],
  issues: Issue[],
  referenceDate: string = APP_CONFIG.demoClockDate,
): WorkspaceStats {
  let activeAssets = 0;
  let inactiveAssets = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let neverInspectedCount = 0;
  let okCount = 0;

  for (const asset of assets) {
    if (asset.operationalStatus === 'inactive') {
      inactiveAssets++;
    } else {
      activeAssets++;
    }

    const scheduleStatus = computeAssetInspectionStatus(asset, referenceDate);
    if (scheduleStatus === 'overdue') overdueCount++;
    else if (scheduleStatus === 'due_soon') dueSoonCount++;
    else if (scheduleStatus === 'never_inspected') neverInspectedCount++;
    else if (scheduleStatus === 'ok') okCount++;
  }

  let openIssuesCount = 0;
  let inProgressIssuesCount = 0;
  for (const issue of issues) {
    if (issue.status === 'open') openIssuesCount++;
    else if (issue.status === 'in_progress') inProgressIssuesCount++;
  }

  const thirtyDaysAgo = addDaysISODate(referenceDate, -30);
  const recentApprovedCount = records.filter(
    (r) => r.submittedAt.slice(0, 10) >= thirtyDaysAgo && r.overallResult === 'approved',
  ).length;

  return {
    totalAssets: assets.length,
    activeAssets,
    inactiveAssets,
    overdueCount,
    dueSoonCount,
    neverInspectedCount,
    okCount,
    openIssuesCount,
    inProgressIssuesCount,
    unresolvedIssuesCount: openIssuesCount + inProgressIssuesCount,
    totalRecordsCount: records.length,
    recentApprovedCount,
  };
}

export function getAssetOpenIssues(assetId: string, issues: Issue[]): Issue[] {
  return issues.filter((i) => i.assetId === assetId && i.status !== 'resolved');
}

export function filterAssets(
  assets: Asset[],
  filters: AssetFilterState,
  referenceDate: string = APP_CONFIG.demoClockDate,
): Asset[] {
  const query = filters.search.trim().toLowerCase();

  return assets.filter((asset) => {
    if (query) {
      const matchesText =
        asset.name.toLowerCase().includes(query) ||
        asset.code.toLowerCase().includes(query) ||
        asset.serialNumber.toLowerCase().includes(query) ||
        asset.model.toLowerCase().includes(query) ||
        asset.sector.toLowerCase().includes(query);
      if (!matchesText) return false;
    }

    if (filters.siteId && filters.siteId !== 'all' && asset.siteId !== filters.siteId) {
      return false;
    }

    if (filters.category && filters.category !== 'all' && asset.category !== filters.category) {
      return false;
    }

    if (
      filters.operationalStatus &&
      filters.operationalStatus !== 'all' &&
      asset.operationalStatus !== filters.operationalStatus
    ) {
      return false;
    }

    if (filters.inspectionStatus && filters.inspectionStatus !== 'all') {
      const status = computeAssetInspectionStatus(asset, referenceDate);
      if (status !== filters.inspectionStatus) return false;
    }

    return true;
  });
}

export interface AssetValidationErrors {
  name?: string;
  code?: string;
  siteId?: string;
  assigneeId?: string;
  inspectionCycleDays?: string;
}

export function validateAssetInput(
  input: {
    name: string;
    code: string;
    siteId: string;
    assigneeId: string;
    inspectionCycleDays: number;
  },
  existingAssets: Asset[],
  editingAssetId?: string,
): AssetValidationErrors {
  const errors: AssetValidationErrors = {};
  const trimmedName = input.name.trim();
  const trimmedCode = input.code.trim().toUpperCase();

  if (!trimmedName) {
    errors.name = 'Informe o nome do equipamento.';
  } else if (trimmedName.length < 3) {
    errors.name = 'O nome deve ter pelo menos 3 caracteres.';
  }

  if (!trimmedCode) {
    errors.code = 'Informe o código identificador do equipamento.';
  } else {
    const duplicate = existingAssets.find(
      (a) => a.code.trim().toUpperCase() === trimmedCode && a.id !== editingAssetId,
    );
    if (duplicate) {
      errors.code = `Já existe outro equipamento com o código "${trimmedCode}" (${duplicate.name}).`;
    }
  }

  if (!input.siteId) {
    errors.siteId = 'Selecione o local do equipamento.';
  }

  if (!input.assigneeId) {
    errors.assigneeId = 'Selecione um responsável.';
  }

  if (
    !Number.isFinite(input.inspectionCycleDays) ||
    input.inspectionCycleDays < 1 ||
    input.inspectionCycleDays > 730
  ) {
    errors.inspectionCycleDays = 'Informe um ciclo entre 1 e 730 dias.';
  }

  return errors;
}

export interface DraftAnswerMap {
  [itemId: string]: {
    status?: ChecklistAnswerValue;
    numericValue?: string;
    note?: string;
    photoDataUrl?: string;
    photoName?: string;
  };
}

export interface InspectionValidationError {
  itemId: string;
  message: string;
}

export function validateInspectionDraft(
  template: ChecklistTemplate,
  answers: DraftAnswerMap,
): InspectionValidationError[] {
  const errors: InspectionValidationError[] = [];

  for (const item of template.items) {
    const ans = answers[item.id];
    if (item.required && (!ans || !ans.status)) {
      errors.push({
        itemId: item.id,
        message: 'Selecione Conforme, Não conforme ou N/A.',
      });
      continue;
    }

    if (!ans || !ans.status) continue;

    if (item.type === 'number' && ans.status !== 'na') {
      const val = (ans.numericValue ?? '').trim();
      if (item.required && !val) {
        errors.push({
          itemId: item.id,
          message: `Informe a leitura numérica${item.unit ? ` (${item.unit})` : ''}.`,
        });
      } else if (val && Number.isNaN(Number(val.replace(',', '.')))) {
        errors.push({
          itemId: item.id,
          message: 'Informe um valor numérico válido.',
        });
      }
    }

    if (ans.status === 'non_conforming' && !(ans.note ?? '').trim()) {
      errors.push({
        itemId: item.id,
        message: 'Descreva o problema encontrado para itens não conformes.',
      });
    }

    const needsPhoto =
      item.photoRequired || (item.photoRequiredOnFail && ans.status === 'non_conforming');
    if (needsPhoto && ans.status !== 'na' && !ans.photoDataUrl) {
      errors.push({
        itemId: item.id,
        message: 'Anexe uma foto obrigatória para este item.',
      });
    }
  }

  return errors;
}

export interface SubmissionResult {
  record: InspectionRecord;
  updatedAsset: Asset;
  createdIssues: Issue[];
}

export function buildInspectionSubmission(params: {
  asset: Asset;
  template: ChecklistTemplate;
  answers: DraftAnswerMap;
  inspector: Member;
  generalNotes: string;
  submittedAtISO: string;
  idempotencyKey: string;
  existingRecords: InspectionRecord[];
  existingIssues: Issue[];
}): { duplicateOf?: InspectionRecord; result?: SubmissionResult } {
  const existingDuplicate = params.existingRecords.find(
    (r) => r.idempotencyKey && r.idempotencyKey === params.idempotencyKey,
  );
  if (existingDuplicate) {
    return { duplicateOf: existingDuplicate };
  }

  let conformingCount = 0;
  let nonConformingCount = 0;
  let naCount = 0;
  const compiledAnswers: InspectionAnswer[] = [];

  for (const item of params.template.items) {
    const raw = params.answers[item.id];
    const status: ChecklistAnswerValue = raw?.status ?? 'na';
    if (status === 'conforming') conformingCount++;
    else if (status === 'non_conforming') nonConformingCount++;
    else naCount++;

    compiledAnswers.push({
      itemId: item.id,
      section: item.section,
      label: item.label,
      type: item.type,
      unit: item.unit,
      status,
      numericValue: raw?.numericValue?.trim() || undefined,
      note: raw?.note?.trim() || undefined,
      photoDataUrl: raw?.photoDataUrl,
      photoName: raw?.photoName,
    });
  }

  const recordNum = params.existingRecords.length + 1;
  const recordId = `insp-${String(recordNum).padStart(4, '0')}-${Date.now().toString(36).slice(-4)}`;

  const record: InspectionRecord = {
    id: recordId,
    idempotencyKey: params.idempotencyKey,
    assetId: params.asset.id,
    assetCodeSnapshot: params.asset.code,
    assetNameSnapshot: params.asset.name,
    siteIdSnapshot: params.asset.siteId,
    templateId: params.template.id,
    templateNameSnapshot: params.template.name,
    inspectorId: params.inspector.id,
    inspectorNameSnapshot: params.inspector.name,
    submittedAt: params.submittedAtISO,
    overallResult: nonConformingCount > 0 ? 'with_issues' : 'approved',
    conformingCount,
    nonConformingCount,
    naCount,
    generalNotes: params.generalNotes.trim(),
    answers: compiledAnswers,
  };

  const nextDue = addDaysISODate(params.submittedAtISO, params.asset.inspectionCycleDays);
  const updatedAsset: Asset = {
    ...params.asset,
    lastInspectionAt: params.submittedAtISO,
    nextInspectionDue: nextDue,
    updatedAt: params.submittedAtISO,
  };

  const createdIssues: Issue[] = [];
  let issueIndex = params.existingIssues.length + 1;

  for (const ans of compiledAnswers) {
    if (ans.status === 'non_conforming') {
      const issueId = `iss-${String(issueIndex).padStart(4, '0')}-${Date.now().toString(36).slice(-3)}`;
      issueIndex++;
      createdIssues.push({
        id: issueId,
        assetId: params.asset.id,
        inspectionId: record.id,
        itemId: ans.itemId,
        title: ans.label,
        description: ans.note || 'Item reprovado durante inspeção em campo.',
        priority: 'high',
        status: 'open',
        assigneeId: params.asset.assigneeId,
        dueDate: addDaysISODate(params.submittedAtISO, 3),
        createdAt: params.submittedAtISO,
        updatedAt: params.submittedAtISO,
        photoDataUrl: ans.photoDataUrl,
      });
    }
  }

  return {
    result: {
      record,
      updatedAsset,
      createdIssues,
    },
  };
}

export function resolveIssueWithOutcome(
  issue: Issue,
  resolutionNote: string,
  resolverId: string,
  resolvedAtISO: string,
): { error?: string; updatedIssue?: Issue } {
  const trimmed = resolutionNote.trim();
  if (!trimmed || trimmed.length < 5) {
    return {
      error: 'Descreva o tratamento realizado (mínimo de 5 caracteres) antes de concluir.',
    };
  }

  return {
    updatedIssue: {
      ...issue,
      status: 'resolved',
      resolutionNote: trimmed,
      resolvedById: resolverId,
      resolvedAt: resolvedAtISO,
      updatedAt: resolvedAtISO,
    },
  };
}
