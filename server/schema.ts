import { z } from 'zod';
import { roleSchema } from './invitations';
import { validDate } from '../src/utils/operations';
const obj = z.strictObject;
const short = z.string().max(240);
const memo = z.string().max(8000);
const id = z
  .string()
  .min(1)
  .max(250)
  .regex(/^[A-Za-z0-9:_-]+$/)
  .refine((v) => !['__proto__', 'constructor', 'prototype', 'toString'].includes(v));
const photo = z.string().max(7_000_000).optional();
const date = z.string().refine(validDate);
const priority = z.enum(['high', 'medium', 'low']);
const category = z.enum([
  'Climatização',
  'Compressores',
  'Movimentação',
  'Energia',
  'Ferramentas',
  'Elétrica',
]);
const answerStatus = z.enum(['conforming', 'non_conforming', 'na']);
const asset = obj({
  name: short.trim().min(3),
  code: short.trim().min(1),
  category,
  siteId: id,
  assigneeId: id,
  sector: short,
  templateId: id,
  operationalStatus: z.enum(['active', 'inactive', 'maintenance']),
  inspectionCycleDays: z.int().min(1).max(730),
  manufacturer: short,
  model: short,
  serialNumber: short,
  notes: memo,
  photoDataUrl: photo,
});
const newAsset = asset.extend({ lastInspectionAt: z.null(), nextInspectionDue: z.null() });
const question = obj({
  id,
  section: short,
  label: short,
  type: z.enum(['check', 'number', 'single_choice', 'date']),
  unit: short.optional(),
  required: z.boolean(),
  photoRequired: z.boolean(),
  photoRequiredOnFail: z.boolean().optional(),
  options: z.array(short).max(50).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  visibleWhen: obj({ itemId: id, equals: short }).optional(),
});
const template = obj({
  id,
  name: short.trim().min(1),
  category: z.union([category, z.literal('Geral')]),
  description: memo,
  version: z.int().min(0).optional(),
  updatedAt: short,
  items: z.array(question).max(100),
});
const answer = obj({
  status: answerStatus.optional(),
  numericValue: short.optional(),
  value: short.optional(),
  note: memo.optional(),
  photoDataUrl: photo,
  photoName: short.optional(),
});
const input = obj({
  assetId: id,
  templateId: id,
  templateVersion: z.int().positive(),
  inspectorId: id,
  generalNotes: memo,
  answers: z.record(id, answer).refine((a) => Object.keys(a).length <= 100),
  idempotencyKey: id,
  taskId: id.optional(),
});
const change = obj({
  actorId: id,
  assigneeId: short.optional(),
  assigneeName: short.optional(),
  dueDate: short.optional(),
  priority: priority.optional(),
  note: memo.optional(),
  photoDataUrl: photo,
  photoName: short.optional(),
});
const plan = obj({
  name: short.trim().min(3),
  assetIds: z.array(id).min(1).max(50),
  templateId: id,
  assigneeId: id,
  startDate: date,
  frequency: z.enum(['daily', 'weekly', 'monthly']),
});
const company = obj({
  name: short.trim().min(1),
  tradeName: short,
  cnpj: short,
  city: short,
  contactEmail: z.union([z.email().max(254), z.literal('')]),
});
const patch = obj({
  role: roleSchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  name: short.trim().min(1).optional(),
  jobTitle: short.optional(),
});
export const envelope = obj({
  requestId: z.uuid(),
  revision: id.optional(),
  command: z.discriminatedUnion('type', [
    obj({ type: z.literal('asset.create'), draft: newAsset }),
    obj({ type: z.literal('asset.update'), assetId: id, patch: asset.partial() }),
    obj({ type: z.literal('asset.import'), drafts: z.array(newAsset).min(1).max(100) }),
    obj({ type: z.literal('asset.status'), assetId: id, status: z.enum(['active', 'inactive']) }),
    obj({ type: z.literal('inspection.submit'), input }),
    obj({
      type: z.literal('request.create'),
      assetId: id,
      draft: obj({
        title: short.trim().min(3),
        description: memo.trim().min(5),
        reportedBy: short.optional(),
        photoDataUrl: photo,
        priority,
      }),
    }),
    obj({
      type: z.literal('issue.change'),
      issueId: id,
      action: z.enum(['assign', 'start', 'submit', 'approve', 'reject']),
      change,
    }),
    obj({ type: z.literal('plan.save'), draft: plan }),
    obj({ type: z.literal('template.draft'), template }),
    obj({ type: z.literal('template.publish'), template }),
    obj({
      type: z.literal('template.apply'),
      templateId: id,
      category: z.union([category, z.literal('all')]),
    }),
    obj({ type: z.literal('company.update'), company }),
    obj({ type: z.literal('member.update'), memberId: id, patch }),
  ]),
});
