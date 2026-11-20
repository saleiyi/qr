import type {
  Asset,
  ChecklistTemplate,
  EquipmentCategory,
  InspectionRecord,
  Member,
  OperationalStatus,
  Site,
} from '../types/domain';
import { formatDateBR, formatDateTimeBR } from './date';

const VALID_CATEGORIES: EquipmentCategory[] = [
  'Climatização',
  'Compressores',
  'Movimentação',
  'Energia',
  'Ferramentas',
  'Elétrica',
];

export const SAMPLE_IMPORT_CSV = [
  'codigo,nome,categoria,local,responsavel,ciclo_dias,status_operacional,modelo,numero_serie,observacoes',
  'EQ-101,Chiller Secundário Leste,Climatização,Unidade Industrial Campinas,Carlos Eduardo Silva,30,active,Carrier 30XA,SN-CH-9012,Instalação na cobertura do bloco B',
  'EQ-102,Compressor Auxiliar Linha 2,Compressores,Galpão Logístico Guarulhos,Mariana Costa Oliveira,15,active,Atlas Copco GA-15,SN-AC-4410,Verificar dreno de condensado semanalmente',
  'EQ-103,Painel Geral Quadro QGBT-3,Elétrica,Sede Administrativa Paulista,Rafael Mendes Rocha,60,active,Schneider Prisma P,SN-EL-7782,Chaveamento automático com grupo gerador',
].join('\n');

/**
 * Parses CSV text handling quoted fields, escaped quotes, and CRLF/LF line endings.
 */
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

export interface ParsedCsvAssetRow {
  rowNumber: number;
  rawCode: string;
  rawName: string;
  errors: string[];
  assetDraft?: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'files'>;
}

export interface CsvImportValidationResult {
  headerError?: string;
  rows: ParsedCsvAssetRow[];
  validCount: number;
  errorCount: number;
}

const EXPECTED_HEADERS = [
  'codigo',
  'nome',
  'categoria',
  'local',
  'responsavel',
  'ciclo_dias',
];

export function validateCsvAssetImport(
  csvText: string,
  context: {
    existingAssets: Asset[];
    sites: Site[];
    members: Member[];
    templates: ChecklistTemplate[];
  },
): CsvImportValidationResult {
  const parsed = parseCsvRows(csvText);
  if (parsed.length === 0) {
    return {
      headerError: 'O arquivo CSV está vazio.',
      rows: [],
      validCount: 0,
      errorCount: 0,
    };
  }

  const headers = parsed[0].map((h) => h.toLowerCase().trim());
  const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      headerError: `Colunas obrigatórias ausentes no cabeçalho: ${missingHeaders.join(', ')}. Use o modelo CSV de exemplo.`,
      rows: [],
      validCount: 0,
      errorCount: 0,
    };
  }

  if (parsed.length === 1) {
    return {
      headerError: 'O arquivo contém apenas o cabeçalho, sem nenhuma linha de equipamento.',
      rows: [],
      validCount: 0,
      errorCount: 0,
    };
  }

  const colIndex = (name: string) => headers.indexOf(name);
  const existingCodes = new Set(
    context.existingAssets.map((a) => a.code.trim().toUpperCase()),
  );
  const seenCodesInFile = new Set<string>();

  const rows: ParsedCsvAssetRow[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    const rowNumber = i + 1;
    const get = (col: string) => {
      const idx = colIndex(col);
      return idx >= 0 && idx < row.length ? row[idx].trim() : '';
    };

    const code = get('codigo').toUpperCase();
    const name = get('nome');
    const categoryRaw = get('categoria');
    const siteName = get('local');
    const assigneeName = get('responsavel');
    const cycleStr = get('ciclo_dias');
    const statusRaw = get('status_operacional').toLowerCase();
    const model = get('modelo');
    const serialNumber = get('numero_serie');
    const notes = get('observacoes');

    const errors: string[] = [];

    if (!code) {
      errors.push('Código ausente.');
    } else if (existingCodes.has(code)) {
      errors.push(`Código "${code}" já cadastrado no sistema.`);
    } else if (seenCodesInFile.has(code)) {
      errors.push(`Código "${code}" duplicado dentro do arquivo CSV.`);
    }

    if (!name || name.length < 3) {
      errors.push('Nome do equipamento inválido ou ausente.');
    }

    const matchedCategory = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === categoryRaw.toLowerCase(),
    );
    if (!matchedCategory) {
      errors.push(
        `Categoria "${categoryRaw || '(vazia)'}" inválida. Permitidas: ${VALID_CATEGORIES.join(', ')}.`,
      );
    }

    const matchedSite = context.sites.find(
      (s) => s.name.toLowerCase() === siteName.toLowerCase() || s.id === siteName,
    );
    if (!matchedSite) {
      errors.push(
        `Local "${siteName || '(vazio)'}" não encontrado. Locais válidos: ${context.sites.map((s) => s.name).join(', ')}.`,
      );
    }

    const matchedMember = context.members.find(
      (m) => m.name.toLowerCase() === assigneeName.toLowerCase(),
    );
    if (!matchedMember) {
      errors.push(
        `Responsável "${assigneeName || '(vazio)'}" não encontrado na equipe.`,
      );
    }

    const cycleDays = Number(cycleStr);
    if (!cycleStr || !Number.isInteger(cycleDays) || cycleDays < 1 || cycleDays > 730) {
      errors.push('Ciclo de inspeção (ciclo_dias) deve ser um número inteiro entre 1 e 730.');
    }

    let operationalStatus: OperationalStatus = 'active';
    if (statusRaw) {
      if (statusRaw === 'active' || statusRaw === 'em operação' || statusRaw === 'ativo') {
        operationalStatus = 'active';
      } else if (statusRaw === 'maintenance' || statusRaw === 'em manutenção') {
        operationalStatus = 'maintenance';
      } else if (statusRaw === 'inactive' || statusRaw === 'desativado' || statusRaw === 'inativo') {
        operationalStatus = 'inactive';
      } else {
        errors.push(`Status "${statusRaw}" inválido (use active, maintenance ou inactive).`);
      }
    }

    if (code) {
      seenCodesInFile.add(code);
    }

    const defaultTemplate =
      context.templates.find((t) => t.category === matchedCategory) ??
      context.templates[0];

    if (errors.length === 0 && matchedCategory && matchedSite && matchedMember && defaultTemplate) {
      rows.push({
        rowNumber,
        rawCode: code,
        rawName: name,
        errors: [],
        assetDraft: {
          code,
          name,
          category: matchedCategory,
          siteId: matchedSite.id,
          sector: 'Geral',
          assigneeId: matchedMember.id,
          operationalStatus,
          inspectionCycleDays: cycleDays,
          templateId: defaultTemplate.id,
          lastInspectionAt: null,
          nextInspectionDue: null,
          manufacturer: model ? model.split(' ')[0] : 'Não informado',
          model: model || 'Padrão',
          serialNumber: serialNumber || `IMP-${code}`,
          notes: notes || 'Importado via planilha CSV.',
        },
      });
    } else {
      rows.push({
        rowNumber,
        rawCode: code || '—',
        rawName: name || '—',
        errors,
      });
    }
  }

  return {
    rows,
    validCount: rows.filter((r) => r.errors.length === 0).length,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAssetsCsv(
  assets: Asset[],
  sites: Site[],
  members: Member[],
  getStatusLabel: (asset: Asset) => string,
): string {
  const header = [
    'Código',
    'Equipamento',
    'Categoria',
    'Local',
    'Setor',
    'Responsável',
    'Status Operacional',
    'Situação da Inspeção',
    'Ciclo (dias)',
    'Última Inspeção',
    'Próxima Inspeção',
    'Modelo',
    'Nº Série',
  ];

  const lines = [header.map(escapeCsvCell).join(',')];

  for (const a of assets) {
    const siteName = sites.find((s) => s.id === a.siteId)?.name ?? a.siteId;
    const memberName = members.find((m) => m.id === a.assigneeId)?.name ?? a.assigneeId;
    const opLabel =
      a.operationalStatus === 'active'
        ? 'Em operação'
        : a.operationalStatus === 'maintenance'
          ? 'Em manutenção'
          : 'Desativado';

    lines.push(
      [
        a.code,
        a.name,
        a.category,
        siteName,
        a.sector,
        memberName,
        opLabel,
        getStatusLabel(a),
        a.inspectionCycleDays,
        formatDateBR(a.lastInspectionAt),
        formatDateBR(a.nextInspectionDue),
        a.model,
        a.serialNumber,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}

export function buildRecordsCsv(
  records: InspectionRecord[],
  sites: Site[],
): string {
  const header = [
    'ID Registro',
    'Data e Hora',
    'Código',
    'Equipamento',
    'Local',
    'Modelo de Inspeção',
    'Inspetor',
    'Resultado',
    'Conformes',
    'Não conformes',
    'N/A',
    'Observações Gerais',
  ];

  const lines = [header.map(escapeCsvCell).join(',')];

  for (const r of records) {
    const siteName = sites.find((s) => s.id === r.siteIdSnapshot)?.name ?? r.siteIdSnapshot;
    lines.push(
      [
        r.id,
        formatDateTimeBR(r.submittedAt),
        r.assetCodeSnapshot,
        r.assetNameSnapshot,
        siteName,
        r.templateNameSnapshot,
        r.inspectorNameSnapshot,
        r.overallResult === 'approved' ? 'Aprovada' : 'Com pendências',
        r.conformingCount,
        r.nonConformingCount,
        r.naCount,
        r.generalNotes,
      ]
        .map(escapeCsvCell)
        .join(','),
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
