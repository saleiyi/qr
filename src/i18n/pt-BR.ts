export const ptBR = {
  common: {
    demoTag: 'Demonstração',
    save: 'Salvar',
    saving: 'Salvando...',
    cancel: 'Cancelar',
    close: 'Fechar',
    confirm: 'Confirmar',
    clearFilters: 'Limpar filtros',
    search: 'Buscar',
    loading: 'Carregando dados...',
    noResults: 'Nenhum resultado encontrado',
    required: 'Obrigatório',
  },
  nav: {
    overview: 'Visão geral',
    assets: 'Equipamentos',
    issues: 'Pendências',
    records: 'Registros e relatórios',
    templates: 'Modelos de inspeção',
    settings: 'Equipe e ajustes',
    publicSite: 'Página inicial',
  },
  roles: {
    admin: 'Administrador',
    operator: 'Operador',
    viewer: 'Visualizador',
  },
  operationalStatus: {
    active: 'Em operação',
    maintenance: 'Em manutenção',
    inactive: 'Desativado',
  },
  inspectionStatus: {
    ok: 'Em dia',
    due_soon: 'Vence em breve',
    overdue: 'Atrasada',
    never_inspected: 'Sem inspeção',
    inactive: 'Desativado',
  },
  issueStatus: {
    open: 'Aberta',
    in_progress: 'Em tratamento',
    resolved: 'Resolvida',
  },
  priority: {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  },
};

export type TranslationKeys = typeof ptBR;
