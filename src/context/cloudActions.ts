import type { AppStateContextValue } from './AppStateContext';
import type { Asset, InspectionPlan, InspectionRecord } from '../types/domain';
import type { PilotCommand, PilotIdentity } from '../types/pilot';
import { pilotApi } from '../services/pilotClient';
import type { useOptionalPilot } from './PilotContext';

type Pilot = NonNullable<ReturnType<typeof useOptionalPilot>>;
type Notify = AppStateContextValue['addToast'];

export function createCloudActions(pilot: Pilot, identity: PilotIdentity, notify: Notify) {
  const execute = async (command: PilotCommand, title?: string) => {
    try {
      const response = await pilot.execute(command);
      if (title) notify({ type: 'success', title });
      return { ok: true as const, result: response.result, error: undefined };
    } catch (reason) {
      const error =
        reason instanceof Error ? reason.message : 'Não foi possível confirmar a alteração.';
      notify({ type: 'error', title: 'Alteração não confirmada', description: error });
      return { ok: false as const, result: undefined, error };
    }
  };
  return {
    async createAsset(draft: Parameters<AppStateContextValue['createAsset']>[0]) {
      const result = await execute({ type: 'asset.create', draft }, 'Equipamento cadastrado');
      return {
        ok: result.ok,
        error: result.error,
        asset: result.result?.asset as Asset | undefined,
      };
    },
    async updateAsset(assetId: string, patch: Partial<Asset>) {
      const {
        id: _id,
        createdAt: _created,
        updatedAt: _updated,
        lastInspectionAt: _last,
        nextInspectionDue: _due,
        ...editable
      } = patch;
      return execute({ type: 'asset.update', assetId, patch: editable }, 'Alterações salvas');
    },
    async deactivateAsset(assetId: string) {
      return execute(
        { type: 'asset.status', assetId, status: 'inactive' },
        'Equipamento desativado',
      );
    },
    async reactivateAsset(assetId: string) {
      return execute({ type: 'asset.status', assetId, status: 'active' }, 'Equipamento reativado');
    },
    async importAssetsBatch(drafts: Parameters<AppStateContextValue['importAssetsBatch']>[0]) {
      const result = await execute({ type: 'asset.import', drafts }, 'Importação concluída');
      return {
        ok: result.ok,
        error: result.error,
        importedCount: Number(result.result?.importedCount ?? 0),
      };
    },
    async submitInspection(input: Parameters<AppStateContextValue['submitInspection']>[0]) {
      const result = await execute(
        { type: 'inspection.submit', input: { ...input, inspectorId: identity.memberId } },
        'Inspeção concluída e registrada',
      );
      return {
        ok: result.ok,
        error: result.error,
        record: result.result?.record as InspectionRecord | undefined,
        createdIssuesCount: Number(result.result?.createdIssuesCount ?? 0),
        alreadyCompleted: Boolean(result.result?.alreadyCompleted),
      };
    },
    async applyTemplateToCategory(templateId: string, category: string) {
      const result = await execute(
        { type: 'template.apply', templateId, category },
        'Modelo aplicado aos equipamentos',
      );
      return {
        ok: result.ok,
        error: result.error,
        updatedCount: Number(result.result?.updatedCount ?? 0),
      };
    },
    async updateCompany(company: Parameters<AppStateContextValue['updateCompany']>[0]) {
      return execute({ type: 'company.update', company }, 'Dados da empresa salvos');
    },
    async addMember(member: Parameters<AppStateContextValue['addMember']>[0]) {
      try {
        const result = await pilotApi.invite(identity.workspaceId, {
          email: member.email,
          name: member.name,
          role: member.role,
        });
        pilot.completeEditing('member.invite');
        await pilot.refresh();
        notify({
          type: 'success',
          title: 'Convite criado',
          description: 'Copie o link e compartilhe diretamente com a pessoa convidada.',
        });
        return { ok: true, invitationUrl: result.invitationUrl, expiresAt: result.expiresAt };
      } catch (reason) {
        return {
          ok: false,
          error: reason instanceof Error ? reason.message : 'Não foi possível criar o convite.',
        };
      }
    },
    async updateMember(
      memberId: string,
      patch: Parameters<AppStateContextValue['updateMember']>[1],
    ) {
      return execute({ type: 'member.update', memberId, patch }, 'Perfil atualizado');
    },
    async resetDemoData() {
      notify({
        type: 'error',
        title: 'Dados reais são preservados',
        description: 'A restauração da demonstração não está disponível neste ambiente.',
      });
    },
    async savePlan(draft: Parameters<AppStateContextValue['savePlan']>[0]) {
      const result = await execute(
        { type: 'plan.save', draft },
        'Plano criado e tarefas programadas',
      );
      return {
        ok: result.ok,
        error: result.error,
        plan: result.result?.plan as InspectionPlan | undefined,
      };
    },
    async createRepairRequest(
      assetId: string,
      draft: Parameters<AppStateContextValue['createRepairRequest']>[1],
    ) {
      const result = await execute(
        { type: 'request.create', assetId, draft },
        'Solicitação registrada',
      );
      return {
        ok: result.ok,
        error: result.error,
        issue: result.result?.issue as import('../types/domain').Issue | undefined,
      };
    },
    async changeWorkOrder(
      issueId: string,
      action: Parameters<AppStateContextValue['changeWorkOrder']>[1],
      change: Parameters<AppStateContextValue['changeWorkOrder']>[2],
    ) {
      return execute(
        {
          type: 'issue.change',
          issueId,
          action,
          change: { ...change, actorId: identity.memberId },
        },
        'Ordem de serviço atualizada',
      );
    },
    async saveTemplateDraft(template: Parameters<AppStateContextValue['saveTemplateDraft']>[0]) {
      return execute({ type: 'template.draft', template }, 'Rascunho do modelo salvo');
    },
    async publishTemplate(template: Parameters<AppStateContextValue['publishTemplate']>[0]) {
      return execute({ type: 'template.publish', template }, 'Modelo publicado');
    },
  };
}
