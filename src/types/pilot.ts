import type { AppStateData, Asset, ChecklistTemplate, CompanyProfile, InspectionPlan, IssuePriority, Member, UserRole } from './domain';
import type { InspectionSubmissionInput } from '../context/inspectionAction';
import type { WorkOrderAction, WorkOrderChange } from '../utils/operations';

export interface PilotIdentity {
  userId: string;
  memberId: string;
  workspaceId: string;
  email: string;
  name: string;
  role: UserRole;
}
export interface PilotClock {
  nowISO: string;
  today: string;
  timezone: string;
}
export interface PilotWorkspaceResponse extends PilotClock {
  ok: true;
  identity: PilotIdentity;
  state: AppStateData;
}
export interface PilotFailure {
  ok: false;
  code: string;
  error: string;
}
export type AssetDraft = Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>;
export type PilotCommand =
  | { type: 'asset.create'; draft: AssetDraft }
  | { type: 'asset.update'; assetId: string; patch: Partial<Asset> }
  | { type: 'asset.import'; drafts: AssetDraft[] }
  | { type: 'asset.status'; assetId: string; status: 'active' | 'inactive' }
  | { type: 'inspection.submit'; input: InspectionSubmissionInput }
  | { type: 'request.create'; assetId: string; draft: { title: string; description: string; priority: IssuePriority; reportedBy?: string; photoDataUrl?: string } }
  | { type: 'issue.change'; issueId: string; action: WorkOrderAction; change: WorkOrderChange }
  | { type: 'plan.save'; draft: Omit<InspectionPlan, 'id' | 'createdAt'> }
  | { type: 'template.draft'; template: ChecklistTemplate }
  | { type: 'template.publish'; template: ChecklistTemplate }
  | { type: 'template.apply'; templateId: string; category: string }
  | { type: 'company.update'; company: CompanyProfile }
  | { type: 'member.update'; memberId: string; patch: Partial<Member> };
export interface PilotCommandRequest {
  requestId: string;
  revision?: string;
  command: PilotCommand;
}
export interface PilotCommandResponse extends PilotWorkspaceResponse {
  result: Record<string, unknown>;
}
export interface PilotInvitation {
  email: string;
  name: string;
  role: UserRole;
  companyName: string;
  expiresAt: string;
  existingAccount: boolean;
}
export interface PilotInvitationResponse { ok: true; invitation: PilotInvitation }
export interface PilotInviteCreated {
  ok: true;
  invitationUrl: string;
  expiresAt: string;
  memberId: string;
}
