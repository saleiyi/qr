import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlanTasks, transitionWorkOrder } from './operations';
import { effectiveAnswer, visibleItems, validateTemplate } from './checklist';
import { validateInspectionDraft, buildInspectionSubmission } from './domainLogic';
import { createInitialSeedData } from '../data/seedData';
import type { InspectionPlan, Issue, ChecklistTemplate } from '../types/domain';

test('monthly tasks stay anchored at month end and preserve completed instances', () => {
  const plan: InspectionPlan = { id:'p', name:'Mensal', assetIds:['a'], templateId:'t', assigneeId:'m', startDate:'2026-01-31', frequency:'monthly', createdAt:'2026-01-01' };
  const tasks = generatePlanTasks(plan, '2026-03-31');
  assert.deepEqual(tasks.map(t=>t.dueDate), ['2026-01-31','2026-02-28','2026-03-31']);
  const saved = {...tasks[0], status:'completed' as const, recordId:'record'};
  const refreshed = generatePlanTasks(plan,'2026-03-31',[saved]);
  assert.equal(refreshed.length,3);
  assert.equal(refreshed[0].recordId,'record');
  assert.throws(()=>generatePlanTasks({...plan,startDate:'2026-02-31'},'2026-03-31'));
});

test('work orders require assignment, treatment, review and a rejection reason', () => {
  const issue: Issue = { id:'i',assetId:'a',title:'Falha',description:'Falha no motor',status:'open',priority:'high',assigneeId:'',dueDate:'2026-11-20',createdAt:'now',updatedAt:'now' };
  assert.throws(()=>transitionWorkOrder(issue,'start',{actorId:'m'},'now'));
  const assigned=transitionWorkOrder(issue,'assign',{actorId:'admin',assigneeId:'m',dueDate:'2026-11-22',priority:'medium'},'now');
  const started=transitionWorkOrder(assigned,'start',{actorId:'m'},'now');
  assert.throws(()=>transitionWorkOrder(started,'submit',{actorId:'m',note:'x'},'now'));
  const review=transitionWorkOrder(started,'submit',{actorId:'m',note:'Motor substituído',photoDataUrl:'data:image/jpeg;base64,test'},'now');
  assert.equal(review.status,'awaiting_review');
  assert.throws(()=>transitionWorkOrder(review,'reject',{actorId:'admin',note:''},'now'));
  const rejected=transitionWorkOrder(review,'reject',{actorId:'admin',note:'Verificar o ruído novamente'},'now');
  assert.equal(rejected.status,'in_progress');
  const resolved=transitionWorkOrder(review,'approve',{actorId:'admin',note:'Verificado no local'},'now');
  assert.equal(resolved.status,'resolved');
  assert.equal(resolved.timeline?.length,4);
  assert.equal(issue.timeline,undefined);
  assert.throws(()=>transitionWorkOrder(resolved,'start',{actorId:'m'},'now'));
});

test('hidden checklist branches neither validate nor leak into submitted history', () => {
  const state=createInitialSeedData();
  const template:ChecklistTemplate={...state.templates[0],version:3,items:[
    {id:'choice',section:'Dados',label:'Tipo',type:'single_choice',options:['Rotina','Falha'],required:true,photoRequired:false},
    {id:'detail',section:'Dados',label:'Detalhe',type:'check',required:true,photoRequired:true,visibleWhen:{itemId:'choice',equals:'Falha'}},
  ]};
  const answers={choice:{value:'Rotina',status:'conforming' as const},detail:{status:'non_conforming' as const,note:'Stale hidden answer'}};
  assert.deepEqual(visibleItems(template,answers).map(i=>i.id),['choice']);
  assert.deepEqual(validateInspectionDraft(template,answers),[]);
  const result=buildInspectionSubmission({asset:state.assets[0],template,answers,inspector:state.members[0],generalNotes:'',submittedAtISO:'2026-11-20T10:00:00-03:00',idempotencyKey:'test',existingRecords:[],existingIssues:[]}).result!;
  assert.equal(result.record.answers.length,1);
  assert.equal(result.record.answers[0].value,'Rotina');
  assert.equal(result.record.templateVersion,3);
  assert.equal(result.createdIssues.length,0);
});

test('numeric limits cannot be bypassed with a conforming selection; rules reference earlier fields', () => {
  const item={id:'reading',section:'Dados',label:'Temperatura',type:'number' as const,required:true,photoRequired:false,min:0,max:10};
  assert.equal(effectiveAnswer(item,{numericValue:'12,5',status:'conforming'}).status,'non_conforming');
  const template={...createInitialSeedData().templates[0],items:[item]};
  assert.ok(validateInspectionDraft(template,{reading:{numericValue:'12,5',status:'conforming'}}).some(e=>e.message.includes('problema')));
  assert.ok(validateTemplate({...template,items:[{...item,min:20,max:10}]}));
  assert.ok(validateTemplate({...template,items:[{...item,visibleWhen:{itemId:'reading',equals:'conforming'}}]}));
});
