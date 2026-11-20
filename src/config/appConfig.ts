export interface DemoPlan {
  id: string;
  name: string;
  audience: string;
  priceMonthlyBRL: number;
  assetsLimit: string;
  usersLimit: string;
  features: string[];
  highlighted?: boolean;
}

export const APP_CONFIG = {
  brandName: 'Ativos',
  brandTagline: 'Gestão de equipamentos e inspeções',
  demoLabel: 'Demonstração',
  defaultLocale: 'pt-BR' as const,
  // Unified demo clock so all dates, overdue counts, and timelines stay 100% deterministic
  demoClockISO: '2026-11-20T10:30:00-03:00',
  demoClockDate: '2026-11-20',
  dueSoonWindowDays: 7,
  maxUploadBytes: 5 * 1024 * 1024,
  demoPlans: [
    {
      id: 'essencial',
      name: 'Essencial',
      audience: 'Para equipes enxutas e oficina única',
      priceMonthlyBRL: 149,
      assetsLimit: 'Até 50 equipamentos',
      usersLimit: 'Até 5 membros',
      features: [
        'Fichas técnicas com etiqueta QR',
        'Checklists pelo navegador do celular',
        'Registro de pendências e histórico',
        'Exportação CSV e relatório para impressão',
      ],
    },
    {
      id: 'operacao',
      name: 'Operação',
      audience: 'Para manutenção multiunidade',
      priceMonthlyBRL: 329,
      assetsLimit: 'Até 250 equipamentos',
      usersLimit: 'Até 20 membros',
      highlighted: true,
      features: [
        'Tudo do plano Essencial',
        'Múltiplos locais e setores',
        'Modelos personalizados de inspeção',
        'Impressão em lote de etiquetas A4',
      ],
    },
    {
      id: 'industria',
      name: 'Multiplanta',
      audience: 'Para operações industriais e frotas internas',
      priceMonthlyBRL: 690,
      assetsLimit: 'Equipamentos ilimitados',
      usersLimit: 'Membros ilimitados',
      features: [
        'Tudo do plano Operação',
        'Controle por perfil (Admin, Operador, Visualizador)',
        'Histórico completo de auditoria operacional',
        'Importação e padronização em massa',
      ],
    },
  ] satisfies DemoPlan[],
};
