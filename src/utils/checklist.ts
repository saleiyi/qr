import type { ChecklistTemplate, TemplateItem, InspectionDraft } from '../types/domain';

export type Answer = InspectionDraft['answers'][string];

export function effectiveAnswer(item: TemplateItem, answer: Answer = {}): Answer {
  if (item.type === 'single_choice' || item.type === 'date') {
    return { ...answer, status: answer.value ? 'conforming' : undefined };
  }
  if (
    item.type === 'number' &&
    answer.status !== 'na' &&
    answer.numericValue?.trim() &&
    (item.min !== undefined || item.max !== undefined)
  ) {
    const value = Number(answer.numericValue.replace(',', '.'));
    if (Number.isFinite(value))
      return {
        ...answer,
        status:
          (item.min !== undefined && value < item.min) ||
          (item.max !== undefined && value > item.max)
            ? 'non_conforming'
            : 'conforming',
      };
  }
  return answer;
}

export function visibleItems(
  template: ChecklistTemplate,
  answers: Record<string, Answer>,
): TemplateItem[] {
  const shown = new Set<string>();
  return template.items.filter((item) => {
    const rule = item.visibleWhen;
    if (rule) {
      const parent = template.items.find((candidate) => candidate.id === rule.itemId);
      if (!parent || !shown.has(parent.id)) return false;
      const answer = effectiveAnswer(parent, answers[parent.id]);
      if ((parent.type === 'single_choice' ? answer.value : answer.status) !== rule.equals)
        return false;
    }
    shown.add(item.id);
    return true;
  });
}

export function validateTemplate(template: ChecklistTemplate): string | null {
  if (!template.name.trim()) return 'Informe o nome do modelo.';
  if (!template.items.length) return 'Adicione pelo menos uma pergunta.';
  const seen = new Map<string, TemplateItem>();
  for (const item of template.items) {
    if (!item.label.trim() || !item.section.trim()) return 'Preencha a pergunta e sua seção.';
    if (seen.has(item.id)) return 'As perguntas precisam ter identificadores únicos.';
    if (
      item.type === 'single_choice' &&
      (!item.options ||
        item.options.length < 2 ||
        item.options.some((option) => !option.trim()) ||
        new Set(item.options).size !== item.options.length)
    ) {
      return 'Perguntas de seleção precisam de pelo menos duas opções diferentes.';
    }
    if (
      (item.min !== undefined && !Number.isFinite(item.min)) ||
      (item.max !== undefined && !Number.isFinite(item.max)) ||
      (item.min !== undefined && item.max !== undefined && item.min > item.max)
    ) {
      return 'O limite mínimo deve ser menor ou igual ao máximo.';
    }
    if (item.visibleWhen) {
      const parent = seen.get(item.visibleWhen.itemId);
      const choices =
        parent?.type === 'single_choice'
          ? parent.options
          : parent?.type === 'check' || parent?.type === 'number'
            ? ['conforming', 'non_conforming', 'na']
            : [];
      if (!parent || !choices?.includes(item.visibleWhen.equals)) {
        return 'A condição deve usar uma resposta válida de uma pergunta anterior.';
      }
    }
    seen.set(item.id, item);
  }
  return null;
}
