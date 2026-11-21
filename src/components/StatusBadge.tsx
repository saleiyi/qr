import React from 'react';
import {
  AlertCircle,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  PauseCircle,
  Wrench,
} from 'lucide-react';
import type {
  InspectionScheduleStatus,
  IssuePriority,
  IssueStatus,
  OperationalStatus,
} from '../types/domain';
import { t } from '../i18n';

export const OperationalStatusBadge: React.FC<{ status: OperationalStatus }> = ({
  status,
}) => {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#CBE4D3] bg-[#ECF7EE] px-2 py-0.5 text-xs font-medium text-[#137333] whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.operationalStatus.active}
      </span>
    );
  }
  if (status === 'maintenance') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#F2D3AA] bg-[#FEF6EB] px-2 py-0.5 text-xs font-medium text-[#B76A12] whitespace-nowrap">
        <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.operationalStatus.maintenance}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#DCE4EC] bg-[#F4F7FA] px-2 py-0.5 text-xs font-medium text-[#526980] whitespace-nowrap">
      <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {t.operationalStatus.inactive}
    </span>
  );
};

export const InspectionStatusBadge: React.FC<{
  status: InspectionScheduleStatus;
}> = ({ status }) => {
  switch (status) {
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-[#F4C7C3] bg-[#FEF3F2] px-2 py-0.5 text-xs font-medium text-[#B42318] whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.inspectionStatus.overdue}
        </span>
      );
    case 'due_soon':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-[#F2D3AA] bg-[#FEF6EB] px-2 py-0.5 text-xs font-medium text-[#B76A12] whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.inspectionStatus.due_soon}
        </span>
      );
    case 'ok':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-[#CBE4D3] bg-[#ECF7EE] px-2 py-0.5 text-xs font-medium text-[#137333] whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.inspectionStatus.ok}
        </span>
      );
    case 'never_inspected':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-[#D4DFEA] bg-[#EEF3F8] px-2 py-0.5 text-xs font-medium text-[#35506B] whitespace-nowrap">
          <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.inspectionStatus.never_inspected}
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center gap-1.5 rounded border border-[#DCE4EC] bg-[#F4F7FA] px-2 py-0.5 text-xs font-medium text-[#526980] whitespace-nowrap">
          <PauseCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t.inspectionStatus.inactive}
        </span>
      );
  }
};

export const IssueStatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => {
  if (status === 'awaiting_review') return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-[#C8D7EA] bg-[#EEF3FA] px-2 py-0.5 text-xs font-medium text-[#355B88]"><ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />Aguardando verificação</span>;
  if (status === 'open') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#F4C7C3] bg-[#FEF3F2] px-2 py-0.5 text-xs font-medium text-[#B42318] whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.issueStatus.open}
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-[#F2D3AA] bg-[#FEF6EB] px-2 py-0.5 text-xs font-medium text-[#B76A12] whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.issueStatus.in_progress}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#CBE4D3] bg-[#ECF7EE] px-2 py-0.5 text-xs font-medium text-[#137333] whitespace-nowrap">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {t.issueStatus.resolved}
    </span>
  );
};

export const IssuePriorityLabel: React.FC<{ priority: IssuePriority }> = ({
  priority,
}) => {
  if (priority === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B42318] whitespace-nowrap">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.priority.high}
      </span>
    );
  }
  if (priority === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B76A12] whitespace-nowrap">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.priority.medium}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#476078] whitespace-nowrap">
      {t.priority.low}
    </span>
  );
};
