import type {
  AppStateData,
  Asset,
  ChecklistTemplate,
  EquipmentCategory,
  InspectionAnswer,
  InspectionRecord,
  Issue,
  Member,
  OperationalStatus,
  Site,
} from '../types/domain';
import { addDaysISODate } from '../utils/date';

const SITES: Site[] = [
  {
    id: 'site-campinas',
    name: 'Unidade Industrial Campinas',
    city: 'Campinas - SP',
    address: 'Rod. Anhanguera, Km 98 — Distrito Industrial',
  },
  {
    id: 'site-guarulhos',
    name: 'Galpão Logístico Guarulhos',
    city: 'Guarulhos - SP',
    address: 'Av. Júlia Gaiolli, 740 — Bonsucesso',
  },
  {
    id: 'site-paulista',
    name: 'Sede Administrativa Paulista',
    city: 'São Paulo - SP',
    address: 'Rua Pamplona, 1120 — Jardim Paulista',
  },
];

const MEMBERS: Member[] = [
  {
    id: 'mem-carlos',
    name: 'Carlos Eduardo Silva',
    role: 'admin',
    jobTitle: 'Coordenador de Manutenção',
    email: 'carlos.silva@valeverde.ind.br',
    status: 'active',
  },
  {
    id: 'mem-mariana',
    name: 'Mariana Costa Oliveira',
    role: 'operator',
    jobTitle: 'Técnica de Climatização e Utilidades',
    email: 'mariana.costa@valeverde.ind.br',
    status: 'active',
  },
  {
    id: 'mem-rafael',
    name: 'Rafael Mendes Rocha',
    role: 'operator',
    jobTitle: 'Eletricista Industrial',
    email: 'rafael.rocha@valeverde.ind.br',
    status: 'active',
  },
  {
    id: 'mem-juliana',
    name: 'Juliana Almeida Santos',
    role: 'viewer',
    jobTitle: 'Supervisora de Qualidade e Segurança',
    email: 'juliana.santos@valeverde.ind.br',
    status: 'active',
  },
];

const TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tpl-hvac',
    name: 'Inspeção de Climatização e Chiller',
    category: 'Climatização',
    description: 'Verificação periódica de unidades evaporadoras, condensadoras, dreno e temperatura.',
    updatedAt: '2026-10-12T09:00:00-03:00',
    items: [
      {
        id: 'hvac-1',
        section: 'Limpeza e Estrutura',
        label: 'Filtros de ar limpos e sem obstruções',
        type: 'check',
        required: true,
        photoRequired: false,
        photoRequiredOnFail: true,
      },
      {
        id: 'hvac-2',
        section: 'Limpeza e Estrutura',
        label: 'Bandeja e linha de dreno desobstruídas e sem vazamento',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'hvac-3',
        section: 'Operação e Leituras',
        label: 'Temperatura de insuflamento na faixa nominal',
        type: 'number',
        unit: '°C',
        required: true,
        photoRequired: false,
      },
      {
        id: 'hvac-4',
        section: 'Operação e Leituras',
        label: 'Ausência de ruído ou vibração anormal nos ventiladores',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'hvac-5',
        section: 'Segurança Elétrica',
        label: 'Disjuntor, bornes e isolamento sem sinais de aquecimento',
        type: 'check',
        required: true,
        photoRequired: false,
      },
    ],
  },
  {
    id: 'tpl-tools',
    name: 'Inspeção de Ferramentas e Bancada',
    category: 'Ferramentas',
    description: 'Checagem de segurança, cabos, proteções e calibração antes do uso em oficina.',
    updatedAt: '2026-10-20T14:30:00-03:00',
    items: [
      {
        id: 'tool-1',
        section: 'Integridade Física',
        label: 'Carcaça, empunhadura e trava do gatilho sem trincas',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'tool-2',
        section: 'Integridade Física',
        label: 'Proteção de disco ou capa de segurança instalada',
        type: 'check',
        required: true,
        photoRequired: false,
        photoRequiredOnFail: true,
      },
      {
        id: 'tool-3',
        section: 'Segurança Elétrica',
        label: 'Cabo de alimentação e plugue padrão NBR sem emendas',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'tool-4',
        section: 'Operação',
        label: 'Teste em vazio sem faiscamento excessivo no coletor',
        type: 'check',
        required: true,
        photoRequired: false,
      },
    ],
  },
  {
    id: 'tpl-general',
    name: 'Inspeção Periódica Geral de Equipamento',
    category: 'Geral',
    description: 'Modelo padrão para compressores, empilhadeiras e ativos mecânicos.',
    updatedAt: '2026-11-02T11:15:00-03:00',
    items: [
      {
        id: 'gen-1',
        section: 'Condição Geral',
        label: 'Etiqueta de identificação legível e área ao redor desobstruída',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'gen-2',
        section: 'Condição Geral',
        label: 'Ausência de vazamentos de óleo, ar comprimido ou fluido',
        type: 'check',
        required: true,
        photoRequired: false,
        photoRequiredOnFail: true,
      },
      {
        id: 'gen-3',
        section: 'Segurança e Controles',
        label: 'Botão de parada de emergência e proteções atuantes',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'gen-4',
        section: 'Leituras',
        label: 'Pressão ou horímetro registrado no painel',
        type: 'number',
        unit: 'bar / h',
        required: true,
        photoRequired: false,
      },
      {
        id: 'gen-5',
        section: 'Lubrificação e Limpeza',
        label: 'Nível de óleo e elementos filtrantes dentro da faixa',
        type: 'check',
        required: true,
        photoRequired: false,
      },
    ],
  },
  {
    id: 'tpl-power',
    name: 'Inspeção de Energia, Geradores e Quadros',
    category: 'Energia',
    description: 'Checklist de conformidade elétrica, aterramento, baterias e QGBT.',
    updatedAt: '2026-11-05T16:00:00-03:00',
    items: [
      {
        id: 'pwr-1',
        section: 'Segurança e Sinalização',
        label: 'Sinalização de risco elétrico e bloqueio de porta íntegros',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'pwr-2',
        section: 'Segurança e Sinalização',
        label: 'Barramento de aterramento e proteção IP sem oxidação',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'pwr-3',
        section: 'Leituras Elétricas',
        label: 'Tensão de saída ou tensão do banco de baterias',
        type: 'number',
        unit: 'V',
        required: true,
        photoRequired: false,
      },
      {
        id: 'pwr-4',
        section: 'Operação',
        label: 'Ausência de pontos quentes ou odor de isolação aquecida',
        type: 'check',
        required: true,
        photoRequired: false,
      },
      {
        id: 'pwr-5',
        section: 'Operação',
        label: 'Teste funcional de alarme e chaves seletoras',
        type: 'check',
        required: true,
        photoRequired: false,
      },
    ],
  },
];

interface AssetSeedSpec {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  siteId: string;
  sector: string;
  assigneeId: string;
  operationalStatus: OperationalStatus;
  cycleDays: number;
  templateId: string;
  lastInspectionAt: string | null;
  nextInspectionDue: string | null;
  manufacturer: string;
  model: string;
  serialNumber: string;
  notes: string;
}

const ASSET_SPECS: AssetSeedSpec[] = [
  // 5 Overdue assets (relative to 2026-11-20)
  {
    id: 'eq-001',
    code: 'EQ-001',
    name: 'Chiller Central Linha A',
    category: 'Climatização',
    siteId: 'site-campinas',
    sector: 'Cobertura Bloco A',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-10-10T09:15:00-03:00',
    nextInspectionDue: '2026-11-09',
    manufacturer: 'Carrier',
    model: '30XA-120',
    serialNumber: 'BR-CAR-88412',
    notes: 'Atende climatização das salas de metrologia e usinagem.',
  },
  {
    id: 'eq-002',
    code: 'EQ-002',
    name: 'Compressor Parafuso Principal',
    category: 'Compressores',
    siteId: 'site-campinas',
    sector: 'Casa de Máquinas',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 15,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-10-29T14:20:00-03:00',
    nextInspectionDue: '2026-11-13',
    manufacturer: 'Atlas Copco',
    model: 'GA-30 VSD+',
    serialNumber: 'AC-BR-55210',
    notes: 'Manter pressão de linha em 7,5 bar durante turno diurno.',
  },
  {
    id: 'eq-003',
    code: 'EQ-003',
    name: 'Empilhadeira Elétrica Retrátil #01',
    category: 'Movimentação',
    siteId: 'site-guarulhos',
    sector: 'Docas 1 a 4',
    assigneeId: 'mem-carlos',
    operationalStatus: 'maintenance',
    cycleDays: 15,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-11-01T08:40:00-03:00',
    nextInspectionDue: '2026-11-16',
    manufacturer: 'Still',
    model: 'FM-X17',
    serialNumber: 'ST-2023-1904',
    notes: 'Aguardando troca de rodízio de carga dianteiro.',
  },
  {
    id: 'eq-004',
    code: 'EQ-004',
    name: 'Grupo Gerador Diesel 250 kVA',
    category: 'Energia',
    siteId: 'site-campinas',
    sector: 'Subestação Externa',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-10-18T11:00:00-03:00',
    nextInspectionDue: '2026-11-17',
    manufacturer: 'Stemac',
    model: 'ST-250D',
    serialNumber: 'STM-99201-BR',
    notes: 'Teste em carga mensal toda segunda sexta-feira.',
  },
  {
    id: 'eq-005',
    code: 'EQ-005',
    name: 'Quadro Geral QGBT-01',
    category: 'Elétrica',
    siteId: 'site-guarulhos',
    sector: 'Sala Elétrica Norte',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-10-19T16:10:00-03:00',
    nextInspectionDue: '2026-11-18',
    manufacturer: 'Schneider Electric',
    model: 'PrismaSeT P',
    serialNumber: 'SE-QGBT-401',
    notes: 'Termografia semestral agendada para dezembro.',
  },

  // 4 Due Soon assets (between 2026-11-20 and 2026-11-27)
  {
    id: 'eq-006',
    code: 'EQ-006',
    name: 'Split Cassete Sala de Reuniões',
    category: 'Climatização',
    siteId: 'site-paulista',
    sector: '3º Andar — Ala Sul',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-10-21T10:00:00-03:00',
    nextInspectionDue: '2026-11-20',
    manufacturer: 'Daikin',
    model: 'FCQ36KVL',
    serialNumber: 'DK-33108',
    notes: 'Bomba de dreno substituída em agosto/2026.',
  },
  {
    id: 'eq-007',
    code: 'EQ-007',
    name: 'Compressor Pistão Oficina Leve',
    category: 'Compressores',
    siteId: 'site-guarulhos',
    sector: 'Oficina de Apoio',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-10-23T15:30:00-03:00',
    nextInspectionDue: '2026-11-22',
    manufacturer: 'Schulz',
    model: 'MSV 20 Max',
    serialNumber: 'SCH-77211',
    notes: 'Reservatório com laudo NR-13 válido até 08/2027.',
  },
  {
    id: 'eq-008',
    code: 'EQ-008',
    name: 'Transpaleteira Elétrica #03',
    category: 'Movimentação',
    siteId: 'site-guarulhos',
    sector: 'Expedição B',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 15,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-11-09T09:10:00-03:00',
    nextInspectionDue: '2026-11-24',
    manufacturer: 'Toyota',
    model: 'LWE180',
    serialNumber: 'TMH-61402',
    notes: 'Bateria de lítio com carga rápida na doca 2.',
  },
  {
    id: 'eq-009',
    code: 'EQ-009',
    name: 'Esmerilhadeira Angular Bancada 02',
    category: 'Ferramentas',
    siteId: 'site-campinas',
    sector: 'Serralheria',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 15,
    templateId: 'tpl-tools',
    lastInspectionAt: '2026-11-11T13:45:00-03:00',
    nextInspectionDue: '2026-11-26',
    manufacturer: 'Bosch',
    model: 'GWS 22-180',
    serialNumber: 'BSH-88019',
    notes: 'Uso exclusivo com disco de desbaste 7 polegadas.',
  },

  // 12 Compliant / OK assets
  {
    id: 'eq-010',
    code: 'EQ-010',
    name: 'Chiller Reserva Linha B',
    category: 'Climatização',
    siteId: 'site-campinas',
    sector: 'Cobertura Bloco B',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-11-15T10:20:00-03:00',
    nextInspectionDue: '2026-12-15',
    manufacturer: 'Trane',
    model: 'CGAM-080',
    serialNumber: 'TR-40291',
    notes: 'Inspeção recente aprovada, porém há pendência de isolamento em tubulação.',
  },
  {
    id: 'eq-011',
    code: 'EQ-011',
    name: 'Self Contained Galpão Refrigerado',
    category: 'Climatização',
    siteId: 'site-guarulhos',
    sector: 'Câmara Climatizada',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-11-12T11:30:00-03:00',
    nextInspectionDue: '2026-12-12',
    manufacturer: 'Hitachi',
    model: 'RAP-150',
    serialNumber: 'HIT-10934',
    notes: 'Setpoint fixo em 18 °C.',
  },
  {
    id: 'eq-012',
    code: 'EQ-012',
    name: 'VRF Central Andares 1 e 2',
    category: 'Climatização',
    siteId: 'site-paulista',
    sector: 'Terraço Técnico',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-11-14T09:00:00-03:00',
    nextInspectionDue: '2026-12-14',
    manufacturer: 'Midea',
    model: 'V6-450W',
    serialNumber: 'MD-55901',
    notes: 'Limpeza química de serpentina prevista para janeiro.',
  },
  {
    id: 'eq-013',
    code: 'EQ-013',
    name: 'Secador de Ar Comprimido #01',
    category: 'Compressores',
    siteId: 'site-campinas',
    sector: 'Casa de Máquinas',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-11-10T14:00:00-03:00',
    nextInspectionDue: '2026-12-10',
    manufacturer: 'Atlas Copco',
    model: 'FX-11',
    serialNumber: 'AC-FX-2091',
    notes: 'Ponto de orvalho nominal +3 °C.',
  },
  {
    id: 'eq-014',
    code: 'EQ-014',
    name: 'Empilhadeira Contrabalançada #02',
    category: 'Movimentação',
    siteId: 'site-guarulhos',
    sector: 'Pátio de Carga',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 15,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-11-18T08:15:00-03:00',
    nextInspectionDue: '2026-12-03',
    manufacturer: 'Toyota',
    model: '8FBE18',
    serialNumber: 'TMH-88120',
    notes: 'Checklist diário de turno complementado pela inspeção quinzenal.',
  },
  {
    id: 'eq-015',
    code: 'EQ-015',
    name: 'Plataforma Elevatória Tesoura 10m',
    category: 'Movimentação',
    siteId: 'site-campinas',
    sector: 'Almoxarifado Técnico',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-11-13T16:40:00-03:00',
    nextInspectionDue: '2026-12-13',
    manufacturer: 'JLG',
    model: '2632ES',
    serialNumber: 'JLG-90112',
    notes: 'Operação permitida apenas com operador certificado NR-18/NR-35.',
  },
  {
    id: 'eq-016',
    code: 'EQ-016',
    name: 'Nobreak Trifásico CPD 40 kVA',
    category: 'Energia',
    siteId: 'site-paulista',
    sector: 'Sala de Servidores',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-11-16T10:50:00-03:00',
    nextInspectionDue: '2026-12-16',
    manufacturer: 'NHS',
    model: 'Expert Online 40K',
    serialNumber: 'NHS-33491',
    notes: 'Banco de 32 baterias estacionárias substituído em 2025.',
  },
  {
    id: 'eq-017',
    code: 'EQ-017',
    name: 'Banco de Capacitores Automático',
    category: 'Elétrica',
    siteId: 'site-campinas',
    sector: 'Subestação Interna',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-11-08T15:00:00-03:00',
    nextInspectionDue: '2026-12-08',
    manufacturer: 'WEG',
    model: 'BCW-150',
    serialNumber: 'WEG-44120',
    notes: 'Correção de fator de potência mantida em 0,96.',
  },
  {
    id: 'eq-018',
    code: 'EQ-018',
    name: 'Furadeira de Coluna Industrial',
    category: 'Ferramentas',
    siteId: 'site-campinas',
    sector: 'Oficina Mecânica',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-tools',
    lastInspectionAt: '2026-11-11T09:30:00-03:00',
    nextInspectionDue: '2026-12-11',
    manufacturer: 'Motomil',
    model: 'FBH-160',
    serialNumber: 'MTM-19204',
    notes: 'Mandril e proteção acrílica revisados.',
  },
  {
    id: 'eq-019',
    code: 'EQ-019',
    name: 'Martelete Perfurador SDS-Max',
    category: 'Ferramentas',
    siteId: 'site-guarulhos',
    sector: 'Ferramentaria',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-tools',
    lastInspectionAt: '2026-11-07T14:15:00-03:00',
    nextInspectionDue: '2026-12-07',
    manufacturer: 'Makita',
    model: 'HR4013C',
    serialNumber: 'MKT-71022',
    notes: 'Acompanha maleta rígida e jogo de ponteiros.',
  },
  {
    id: 'eq-020',
    code: 'EQ-020',
    name: 'Quadro de Distribuição Iluminação QDL-2',
    category: 'Elétrica',
    siteId: 'site-paulista',
    sector: '2º Andar — Hall',
    assigneeId: 'mem-rafael',
    operationalStatus: 'active',
    cycleDays: 60,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-10-28T11:20:00-03:00',
    nextInspectionDue: '2026-12-27',
    manufacturer: 'Steck',
    model: 'QDC-48',
    serialNumber: 'STK-22801',
    notes: 'Circuitos identificados conforme diagrama unifilar rev.03.',
  },
  {
    id: 'eq-021',
    code: 'EQ-021',
    name: 'Parafusadeira de Impacto Bateria 18V',
    category: 'Ferramentas',
    siteId: 'site-paulista',
    sector: 'Manutenção Predial',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-tools',
    lastInspectionAt: '2026-11-17T17:00:00-03:00',
    nextInspectionDue: '2026-12-17',
    manufacturer: 'DeWalt',
    model: 'DCF887',
    serialNumber: 'DW-50923',
    notes: 'Duas baterias 5Ah cadastradas com carregador rápido.',
  },

  // 2 Never Inspected assets (newly commissioned)
  {
    id: 'eq-022',
    code: 'EQ-022',
    name: 'Compressor Booster Alta Pressão',
    category: 'Compressores',
    siteId: 'site-campinas',
    sector: 'Linha de Corte Laser',
    assigneeId: 'mem-carlos',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-general',
    lastInspectionAt: null,
    nextInspectionDue: null,
    manufacturer: 'Chicago Pneumatic',
    model: 'CPB-30',
    serialNumber: 'CP-99301',
    notes: 'Equipamento recém-instalado. Realizar inspeção inicial de comissionamento.',
  },
  {
    id: 'eq-023',
    code: 'EQ-023',
    name: 'Cortina de Ar Doca 05',
    category: 'Climatização',
    siteId: 'site-guarulhos',
    sector: 'Doca 5 — Recebimento',
    assigneeId: 'mem-mariana',
    operationalStatus: 'active',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: null,
    nextInspectionDue: null,
    manufacturer: 'Agratto',
    model: 'CA-150',
    serialNumber: 'AG-18220',
    notes: 'Aguardando primeira inspeção pós-instalação.',
  },

  // 3 Inactive assets (must keep historical records!)
  {
    id: 'eq-024',
    code: 'EQ-024',
    name: 'Gerador Auxiliar Antigo 80 kVA',
    category: 'Energia',
    siteId: 'site-campinas',
    sector: 'Pátio de Desmobilização',
    assigneeId: 'mem-rafael',
    operationalStatus: 'inactive',
    cycleDays: 30,
    templateId: 'tpl-power',
    lastInspectionAt: '2026-08-12T10:00:00-03:00',
    nextInspectionDue: '2026-09-11',
    manufacturer: 'Cummins',
    model: 'C80D6',
    serialNumber: 'CUM-19884',
    notes: 'Desativado após entrada do novo gerador de 250 kVA. Histórico mantido.',
  },
  {
    id: 'eq-025',
    code: 'EQ-025',
    name: 'Split Hi-Wall Antiga Recepção',
    category: 'Climatização',
    siteId: 'site-paulista',
    sector: 'Térreo — Arquivo',
    assigneeId: 'mem-mariana',
    operationalStatus: 'inactive',
    cycleDays: 30,
    templateId: 'tpl-hvac',
    lastInspectionAt: '2026-07-20T15:20:00-03:00',
    nextInspectionDue: '2026-08-19',
    manufacturer: 'LG',
    model: 'S4-Q24',
    serialNumber: 'LG-44019',
    notes: 'Unidade descomissionada durante reforma do térreo.',
  },
  {
    id: 'eq-026',
    code: 'EQ-026',
    name: 'Empilhadeira Manual Hidráulica #04',
    category: 'Movimentação',
    siteId: 'site-guarulhos',
    sector: 'Área de Sucata',
    assigneeId: 'mem-carlos',
    operationalStatus: 'inactive',
    cycleDays: 30,
    templateId: 'tpl-general',
    lastInspectionAt: '2026-09-02T11:40:00-03:00',
    nextInspectionDue: '2026-10-02',
    manufacturer: 'Paletrans',
    model: 'LM1016',
    serialNumber: 'PLT-33109',
    notes: 'Baixada por desgaste irreversível do mastro hidráulico.',
  },
];

const ASSETS: Asset[] = ASSET_SPECS.map((spec) => ({
  id: spec.id,
  code: spec.code,
  name: spec.name,
  category: spec.category,
  siteId: spec.siteId,
  sector: spec.sector,
  assigneeId: spec.assigneeId,
  operationalStatus: spec.operationalStatus,
  inspectionCycleDays: spec.cycleDays,
  templateId: spec.templateId,
  lastInspectionAt: spec.lastInspectionAt,
  nextInspectionDue: spec.nextInspectionDue,
  manufacturer: spec.manufacturer,
  model: spec.model,
  serialNumber: spec.serialNumber,
  notes: spec.notes,
  files: [
    {
      id: `file-manual-${spec.id}`,
      name: `Manual_Tecnico_${spec.code}.pdf`,
      type: 'manual',
      sizeLabel: '1,4 MB',
      uploadedAt: '2026-03-10T10:00:00-03:00',
    },
    {
      id: `file-cert-${spec.id}`,
      name: `Ficha_Comissionamento_${spec.code}.pdf`,
      type: 'certificate',
      sizeLabel: '420 KB',
      uploadedAt: '2026-04-02T14:20:00-03:00',
    },
  ],
  createdAt: '2026-01-15T09:00:00-03:00',
  updatedAt: spec.lastInspectionAt ?? '2026-11-18T10:00:00-03:00',
}));

function buildAnswersForTemplate(
  template: ChecklistTemplate,
  failItemIndex: number | null,
  failNote?: string,
): InspectionAnswer[] {
  return template.items.map((item, idx) => {
    const isFail = failItemIndex === idx;
    let numericValue: string | undefined;
    if (item.type === 'number') {
      if (item.unit === '°C') numericValue = isFail ? '21.8' : '11.4';
      else if (item.unit === 'V') numericValue = isFail ? '204' : '220';
      else numericValue = isFail ? '5.2' : '7.6';
    }
    return {
      itemId: item.id,
      section: item.section,
      label: item.label,
      type: item.type,
      unit: item.unit,
      status: isFail ? 'non_conforming' : 'conforming',
      numericValue,
      note: isFail ? failNote : undefined,
    };
  });
}

function generateSeedRecordsAndIssues(): {
  records: InspectionRecord[];
  issues: Issue[];
} {
  const records: InspectionRecord[] = [];
  const issues: Issue[] = [];

  const templateMap = new Map(TEMPLATES.map((t) => [t.id, t]));
  const memberMap = new Map(MEMBERS.map((m) => [m.id, m]));

  // Specific historical fail scenarios so records & issues match 100%
  const failScenarios: Record<
    string,
    { failIndex: number; note: string; issueStatus: 'open' | 'in_progress' | 'resolved'; priority: 'high' | 'medium' | 'low'; resolutionNote?: string; dueDaysOffset: number }
  > = {
    'eq-001': {
      failIndex: 1,
      note: 'Bandeja de condensado com acúmulo e pequeno gotejamento na lateral direita.',
      issueStatus: 'open',
      priority: 'high',
      dueDaysOffset: 2,
    },
    'eq-002': {
      failIndex: 1,
      note: 'Microvazamento de óleo na conexão do separador ar/óleo.',
      issueStatus: 'in_progress',
      priority: 'high',
      dueDaysOffset: 3,
    },
    'eq-003': {
      failIndex: 2,
      note: 'Freio de estacionamento com resposta lenta e desgaste no rodízio dianteiro.',
      issueStatus: 'open',
      priority: 'high',
      dueDaysOffset: 1,
    },
    'eq-004': {
      failIndex: 2,
      note: 'Banco de baterias marcando 22,1V em repouso, abaixo do ideal de 24V.',
      issueStatus: 'in_progress',
      priority: 'medium',
      dueDaysOffset: 4,
    },
    'eq-005': {
      failIndex: 3,
      note: 'Aquecimento leve detectado no disjuntor geral de 400A durante pico de carga.',
      issueStatus: 'open',
      priority: 'high',
      dueDaysOffset: 1,
    },
    // eq-010 had a recent APPROVED inspection on 2026-11-15, yet retains an open issue from its October cycle!
    'eq-010-prev': {
      failIndex: 0,
      note: 'Isolamento térmico da linha de sucção rasgado próximo à válvula de serviço.',
      issueStatus: 'open',
      priority: 'medium',
      dueDaysOffset: 5,
    },
    'eq-007-prev': {
      failIndex: 0,
      note: 'Etiqueta patrimonial descolando por exposição à névoa de óleo.',
      issueStatus: 'resolved',
      priority: 'low',
      resolutionNote: 'Aplicada nova etiqueta laminada e limpeza da superfície.',
      dueDaysOffset: -5,
    },
    'eq-014-prev': {
      failIndex: 2,
      note: 'Luz de advertência traseira intermitente durante manobra de ré.',
      issueStatus: 'resolved',
      priority: 'high',
      resolutionNote: 'Substituído chicote do farol traseiro e testado em pátio.',
      dueDaysOffset: -8,
    },
    'eq-017-prev': {
      failIndex: 1,
      note: 'Ponto de oxidação superficial no terminal de aterramento da porta.',
      issueStatus: 'resolved',
      priority: 'medium',
      resolutionNote: 'Feita limpeza mecânica, reaperto e aplicação de pasta antioxidante.',
      dueDaysOffset: -10,
    },
  };

  let recCounter = 1;
  let issCounter = 1;

  for (const asset of ASSETS) {
    if (!asset.lastInspectionAt) continue;

    const template = templateMap.get(asset.templateId) ?? TEMPLATES[0];
    const inspector = memberMap.get(asset.assigneeId) ?? MEMBERS[0];

    // 1. Create latest inspection record
    const latestScenario = failScenarios[asset.id];
    const latestAnswers = buildAnswersForTemplate(
      template,
      latestScenario ? latestScenario.failIndex : null,
      latestScenario?.note,
    );
    const nonConformingLatest = latestAnswers.filter((a) => a.status === 'non_conforming').length;
    const latestRecId = `insp-${String(recCounter++).padStart(4, '0')}`;

    records.push({
      id: latestRecId,
      assetId: asset.id,
      assetCodeSnapshot: asset.code,
      assetNameSnapshot: asset.name,
      siteIdSnapshot: asset.siteId,
      templateId: template.id,
      templateNameSnapshot: template.name,
      inspectorId: inspector.id,
      inspectorNameSnapshot: inspector.name,
      submittedAt: asset.lastInspectionAt,
      overallResult: nonConformingLatest > 0 ? 'with_issues' : 'approved',
      conformingCount: latestAnswers.length - nonConformingLatest,
      nonConformingCount: nonConformingLatest,
      naCount: 0,
      generalNotes: latestScenario
        ? 'Registrada pendência para acompanhamento da equipe técnica.'
        : 'Equipamento operando dentro dos parâmetros esperados.',
      answers: latestAnswers,
    });

    if (latestScenario) {
      const failedItem = latestAnswers[latestScenario.failIndex];
      issues.push({
        id: `iss-${String(issCounter++).padStart(4, '0')}`,
        assetId: asset.id,
        inspectionId: latestRecId,
        itemId: failedItem.itemId,
        title: failedItem.label,
        description: latestScenario.note,
        priority: latestScenario.priority,
        status: latestScenario.issueStatus,
        assigneeId: asset.assigneeId,
        dueDate: addDaysISODate('2026-11-20', latestScenario.dueDaysOffset),
        createdAt: asset.lastInspectionAt,
        updatedAt: asset.lastInspectionAt,
      });
    }

    // 2. Create previous cycle record (ensuring >= 40 total records across 24 inspected assets)
    const prevDate = addDaysISODate(asset.lastInspectionAt, -asset.inspectionCycleDays);
    const prevTimestamp = `${prevDate}T10:15:00-03:00`;
    const prevScenario = failScenarios[`${asset.id}-prev`];
    const prevAnswers = buildAnswersForTemplate(
      template,
      prevScenario ? prevScenario.failIndex : null,
      prevScenario?.note,
    );
    const prevNonConf = prevAnswers.filter((a) => a.status === 'non_conforming').length;
    const prevRecId = `insp-${String(recCounter++).padStart(4, '0')}`;
    const prevInspector = MEMBERS[(recCounter + 1) % 3]; // rotate among active admin/operators

    records.push({
      id: prevRecId,
      assetId: asset.id,
      assetCodeSnapshot: asset.code,
      assetNameSnapshot: asset.name,
      siteIdSnapshot: asset.siteId,
      templateId: template.id,
      templateNameSnapshot: template.name,
      inspectorId: prevInspector.id,
      inspectorNameSnapshot: prevInspector.name,
      submittedAt: prevTimestamp,
      overallResult: prevNonConf > 0 ? 'with_issues' : 'approved',
      conformingCount: prevAnswers.length - prevNonConf,
      nonConformingCount: prevNonConf,
      naCount: 0,
      generalNotes: prevScenario
        ? 'Item sinalizado durante ciclo anterior.'
        : 'Ciclo anterior concluído sem intercorrências.',
      answers: prevAnswers,
    });

    if (prevScenario) {
      const failedItem = prevAnswers[prevScenario.failIndex];
      const isResolved = prevScenario.issueStatus === 'resolved';
      const resolvedAt = isResolved ? `${addDaysISODate(prevDate, 2)}T16:40:00-03:00` : undefined;
      issues.push({
        id: `iss-${String(issCounter++).padStart(4, '0')}`,
        assetId: asset.id,
        inspectionId: prevRecId,
        itemId: failedItem.itemId,
        title: failedItem.label,
        description: prevScenario.note,
        priority: prevScenario.priority,
        status: prevScenario.issueStatus,
        assigneeId: asset.assigneeId,
        dueDate: addDaysISODate('2026-11-20', prevScenario.dueDaysOffset),
        createdAt: prevTimestamp,
        updatedAt: resolvedAt ?? prevTimestamp,
        resolutionNote: prevScenario.resolutionNote,
        resolvedAt,
        resolvedById: isResolved ? 'mem-carlos' : undefined,
      });
    }
  }

  // Sort records newest first
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { records, issues };
}

export function createInitialSeedData(): AppStateData {
  const { records, issues } = generateSeedRecordsAndIssues();
  return {
    company: {
      name: 'Metalúrgica & Logística Vale Verde Ltda.',
      tradeName: 'Vale Verde Operações',
      cnpj: '24.819.302/0001-68',
      city: 'Campinas / São Paulo',
      contactEmail: 'manutencao@valeverde.ind.br',
    },
    sites: SITES,
    members: MEMBERS,
    assets: ASSETS,
    templates: TEMPLATES,
    records,
    issues,
  };
}
