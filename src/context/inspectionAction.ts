import type { AppStateData, InspectionRecord, UserRole } from '../types/domain';
import { APP_CONFIG } from '../config/appConfig';
import { transactAppState } from '../services/storageAdapter';
import {
  buildInspectionSubmission,
  validateInspectionDraft,
  type DraftAnswerMap,
} from '../utils/domainLogic';

export interface InspectionSubmissionInput {
  assetId: string;
  templateId: string;
  templateVersion: number;
  inspectorId: string;
  generalNotes: string;
  answers: DraftAnswerMap;
  idempotencyKey: string;
  taskId?: string;
}
export interface InspectionSubmissionOutcome {
  ok: boolean;
  record?: InspectionRecord;
  createdIssuesCount?: number;
  alreadyCompleted?: boolean;
  error?: string;
}
export async function persistInspection(
  params: InspectionSubmissionInput,
  role: UserRole,
  simulateError: boolean,
): Promise<InspectionSubmissionOutcome & { state?: AppStateData }> {
  if (role === 'viewer') return { ok: false, error: 'Este perfil permite apenas consulta.' };
  const result = await transactAppState<{
    record: InspectionRecord;
    createdIssuesCount: number;
    alreadyCompleted?: boolean;
  }>((current) => {
    const task = params.taskId
      ? current.tasks.find((task) => task.id === params.taskId)
      : undefined;
    if (params.taskId && (!task || task.assetId !== params.assetId))
      throw new Error('Tarefa não encontrada para este equipamento.');
    if (task?.status === 'completed') {
      const record = current.records.find((record) => record.id === task.recordId);
      if (!record) throw new Error('Esta tarefa já foi concluída. Consulte os registros.');
      return { value: { record, createdIssuesCount: 0, alreadyCompleted: true } };
    }
    const asset = current.assets.find((asset) => asset.id === params.assetId);
    const template = current.templates.find((template) => template.id === params.templateId);
    const inspector = current.members.find(
      (member) =>
        member.id === params.inspectorId && member.status === 'active' && member.role !== 'viewer',
    );
    if (!asset || !template || !inspector || asset.operationalStatus === 'inactive')
      throw new Error('Confira o equipamento, o modelo publicado e o inspetor ativo.');
    if (
      (task?.templateId ?? asset.templateId) !== template.id ||
      (template.version ?? 1) !== params.templateVersion
    )
      throw new Error(
        'O modelo ou sua versão foi atualizado em outra aba. Suas respostas continuam nesta tela; reabra a inspeção para revisar as perguntas.',
      );
    const invalid = validateInspectionDraft(template, params.answers);
    if (invalid.length) throw new Error(invalid[0].message);
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
    const submittedAtISO = `${APP_CONFIG.demoClockDate}T${time}-03:00`;
    const submission = buildInspectionSubmission({
      asset,
      template,
      inspector,
      answers: params.answers,
      generalNotes: params.generalNotes,
      submittedAtISO,
      idempotencyKey: params.idempotencyKey,
      existingRecords: current.records,
      existingIssues: current.issues,
    });
    if (submission.duplicateOf)
      return { value: { record: submission.duplicateOf, createdIssuesCount: 0 } };
    if (!submission.result) throw new Error('Não foi possível registrar a inspeção.');
    const { record, updatedAsset, createdIssues } = submission.result;
    record.taskId = task?.id;
    return {
      next: {
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === updatedAsset.id ? updatedAsset : asset,
        ),
        records: [record, ...current.records],
        issues: [...createdIssues, ...current.issues],
        tasks: current.tasks.map((item) =>
          item.id === task?.id
            ? { ...item, status: 'completed', recordId: record.id, completedAt: submittedAtISO }
            : item,
        ),
      },
      value: { record, createdIssuesCount: createdIssues.length },
    };
  }, simulateError);
  return result.ok
    ? { ok: true, ...result.data, state: result.state }
    : { ok: false, error: result.error };
}
