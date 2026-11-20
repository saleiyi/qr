export type EquipmentCategory =
  | 'Climatização'
  | 'Compressores'
  | 'Movimentação'
  | 'Energia'
  | 'Ferramentas'
  | 'Elétrica';

export type OperationalStatus = 'active' | 'maintenance' | 'inactive';

export type InspectionScheduleStatus =
  | 'ok'
  | 'due_soon'
  | 'overdue'
  | 'never_inspected'
  | 'inactive';

export type UserRole = 'admin' | 'operator' | 'viewer';

export type MemberStatus = 'active' | 'inactive';

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export type IssuePriority = 'high' | 'medium' | 'low';

export type ChecklistAnswerValue = 'conforming' | 'non_conforming' | 'na';

export type TemplateItemType = 'check' | 'number';

export interface Site {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface Member {
  id: string;
  name: string;
  role: UserRole;
  jobTitle: string;
  email: string;
  status: MemberStatus;
}

export interface AssetFile {
  id: string;
  name: string;
  type: 'manual' | 'photo' | 'certificate';
  sizeLabel: string;
  uploadedAt: string;
  dataUrl?: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  siteId: string;
  sector: string;
  assigneeId: string;
  operationalStatus: OperationalStatus;
  inspectionCycleDays: number;
  templateId: string;
  lastInspectionAt: string | null;
  nextInspectionDue: string | null;
  manufacturer: string;
  model: string;
  serialNumber: string;
  notes: string;
  photoDataUrl?: string;
  files: AssetFile[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  section: string;
  label: string;
  type: TemplateItemType;
  unit?: string;
  required: boolean;
  photoRequired: boolean;
  photoRequiredOnFail?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  category: EquipmentCategory | 'Geral';
  description: string;
  updatedAt: string;
  items: TemplateItem[];
}

export interface InspectionAnswer {
  itemId: string;
  section: string;
  label: string;
  type: TemplateItemType;
  unit?: string;
  status: ChecklistAnswerValue;
  numericValue?: string;
  note?: string;
  photoDataUrl?: string;
  photoName?: string;
}

export interface InspectionRecord {
  id: string;
  idempotencyKey?: string;
  assetId: string;
  assetCodeSnapshot: string;
  assetNameSnapshot: string;
  siteIdSnapshot: string;
  templateId: string;
  templateNameSnapshot: string;
  inspectorId: string;
  inspectorNameSnapshot: string;
  submittedAt: string;
  overallResult: 'approved' | 'with_issues';
  conformingCount: number;
  nonConformingCount: number;
  naCount: number;
  generalNotes: string;
  answers: InspectionAnswer[];
}

export interface Issue {
  id: string;
  assetId: string;
  inspectionId: string;
  itemId: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  assigneeId: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  photoDataUrl?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedById?: string;
}

export interface InspectionDraft {
  assetId: string;
  templateId: string;
  inspectorId: string;
  generalNotes: string;
  updatedAt: string;
  answers: Record<
    string,
    {
      status?: ChecklistAnswerValue;
      numericValue?: string;
      note?: string;
      photoDataUrl?: string;
      photoName?: string;
    }
  >;
}

export interface CompanyProfile {
  name: string;
  tradeName: string;
  cnpj: string;
  city: string;
  contactEmail: string;
}

export interface DemoSettings {
  simulateLoading: boolean;
  simulateEmptyState: boolean;
  simulateStorageError: boolean;
  activeDemoRole: UserRole;
}

export interface AppStateData {
  company: CompanyProfile;
  sites: Site[];
  members: Member[];
  assets: Asset[];
  templates: ChecklistTemplate[];
  records: InspectionRecord[];
  issues: Issue[];
}

export interface AssetFilterState {
  search: string;
  siteId: string;
  category: string;
  inspectionStatus: string;
  operationalStatus: string;
}
