import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Smartphone,
} from 'lucide-react';

interface InspectionGuideScenario {
  id: string;
  assetId: string;
  code: string;
  category: string;
  title: string;
  subtitle: string;
  frequency: string;
  toleranceSpec: string;
  checkpoints: Array<{ num: string; label: string; detail: string }>;
  sampleFinding: {
    status: 'non_conforming' | 'conforming';
    title: string;
    note: string;
    evidenceCaption: string;
  };
}

const SCENARIOS: InspectionGuideScenario[] = [
  {
    id: 'guide-hvac',
    assetId: 'eq-001',
    code: 'EQ-001',
    category: 'Climatização e Chillers',
    title: 'Inspeção de Chiller Central e Unidade Condensadora',
    subtitle:
      'Checklist visual e leitura térmica para evitar paradas por obstrução de dreno ou perda de rendimento.',
    frequency: 'Ciclo sugerido: 30 dias',
    toleranceSpec: 'Insuflamento nominal: 10,0 °C a 14,5 °C',
    checkpoints: [
      {
        num: '01',
        label: 'Filtros e serpentina desobstruídos',
        detail: 'Verificar acúmulo de poeira ou bloqueio de fluxo de ar na admissão.',
      },
      {
        num: '02',
        label: 'Bandeja e linha de dreno secas',
        detail: 'Confirmar escoamento livre sem transbordamento na lateral do gabinete.',
      },
      {
        num: '03',
        label: 'Leitura de temperatura e painel',
        detail: 'Registrar valor do visor digital e inspecionar bornes sem aquecimento.',
      },
    ],
    sampleFinding: {
      status: 'non_conforming',
      title: 'Exemplo de ocorrência registrada em campo',
      note: 'Bandeja de condensado com acúmulo e gotejamento na lateral direita — gera pendência automática para limpeza.',
      evidenceCaption: 'Evidência simulada · Dreno obstruído (EQ-001)',
    },
  },
  {
    id: 'guide-comp',
    assetId: 'eq-002',
    code: 'EQ-002',
    category: 'Compressores e Ar Comprimido',
    title: 'Rotina Preventiva de Compressor Parafuso e Reservatório',
    subtitle:
      'Conferência de pressão de linha, nível de óleo e estanqueidade das conexões pneumáticas.',
    frequency: 'Ciclo sugerido: 15 dias',
    toleranceSpec: 'Pressão de trabalho: 7,0 a 8,0 bar',
    checkpoints: [
      {
        num: '01',
        label: 'Manômetro e válvula de segurança',
        detail: 'Checar leitura estável na faixa verde e ausência de travamento.',
      },
      {
        num: '02',
        label: 'Conexões e separador ar/óleo',
        detail: 'Procurar névoa de óleo ou vazamento audível nas mangueiras.',
      },
      {
        num: '03',
        label: 'Dreno automático do reservatório',
        detail: 'Acionar purga breve e confirmar saída sem emulsão excessiva.',
      },
    ],
    sampleFinding: {
      status: 'non_conforming',
      title: 'Exemplo de não conformidade em conexão',
      note: 'Microvazamento de óleo na conexão do separador ar/óleo — marcado para reaperto e troca de vedação.',
      evidenceCaption: 'Evidência simulada · Conexão separador (EQ-002)',
    },
  },
  {
    id: 'guide-power',
    assetId: 'eq-005',
    code: 'EQ-005',
    category: 'Quadros Elétricos e Geradores',
    title: 'Verificação de Quadro Geral QGBT e Grupo Gerador',
    subtitle:
      'Inspeção visual de segurança elétrica, aterramento, sinalização de risco e tensão de baterias.',
    frequency: 'Ciclo sugerido: 30 dias',
    toleranceSpec: 'Tensão auxiliar: 220V CA · Banco de baterias: ≥ 24,0V CC',
    checkpoints: [
      {
        num: '01',
        label: 'Fechamento de porta e bloqueio',
        detail: 'Garantir trinco íntegro, acrílico protetor e placa de risco elétrico legível.',
      },
      {
        num: '02',
        label: 'Pontos quentes e odores',
        detail: 'Inspecionar disjuntores principais e barramentos quanto a escurecimento.',
      },
      {
        num: '03',
        label: 'Aterramento e leitura elétrica',
        detail: 'Validar tensão no multimedidor frontal e integridade dos cabos terra.',
      },
    ],
    sampleFinding: {
      status: 'non_conforming',
      title: 'Exemplo de alerta térmico em disjuntor',
      note: 'Aquecimento leve detectado no disjuntor geral de 400A durante pico de carga — encaminhado para termografia.',
      evidenceCaption: 'Evidência simulada · Disjuntor 400A (EQ-005)',
    },
  },
  {
    id: 'guide-forklift',
    assetId: 'eq-003',
    code: 'EQ-003',
    category: 'Movimentação e Empilhadeiras',
    title: 'Checklist de Segurança de Empilhadeira Elétrica',
    subtitle:
      'Checagem pré-operação e quinzenal de freios, rodízios de carga, buzina e parada de emergência.',
    frequency: 'Ciclo sugerido: 15 dias',
    toleranceSpec: 'Freio de estacionamento ativo · Rodízios sem lascamento',
    checkpoints: [
      {
        num: '01',
        label: 'Botão de parada de emergência',
        detail: 'Testar corte imediato de tração e retorno mecânico do cogumelo.',
      },
      {
        num: '02',
        label: 'Rodízios, garfos e mastro',
        detail: 'Verificar desgaste irregular na banda de poliuretano e trincas nos garfos.',
      },
      {
        num: '03',
        label: 'Luzes de advertência e giroflex',
        detail: 'Acionar marcha ré e confirmar sinalização luminosa e sonora.',
      },
    ],
    sampleFinding: {
      status: 'conforming',
      title: 'Exemplo de equipamento liberado após manutenção',
      note: 'Rodízio dianteiro substituído, freio regulado e teste em pátio aprovado sem pendências.',
      evidenceCaption: 'Evidência simulada · Baia de carga (EQ-014)',
    },
  },
];

const GuideSceneDiagram: React.FC<{ scenarioId: string }> = ({ scenarioId }) => {
  if (scenarioId === 'guide-hvac') {
    return (
      <svg viewBox="0 0 420 230" className="h-full w-full" aria-label="Diagrama ilustrativo de inspeção em Chiller HVAC">
        <defs>
          <linearGradient id="skyRoof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17324D" />
            <stop offset="100%" stopColor="#264B6E" />
          </linearGradient>
        </defs>
        <rect width="420" height="230" rx="10" fill="url(#skyRoof)" />
        {/* Concrete technical terrace */}
        <rect x="0" y="176" width="420" height="54" fill="#324B64" />
        <line x1="0" y1="176" x2="420" y2="176" stroke="#7A96B0" strokeWidth="1.5" />
        {/* Chiller body */}
        <rect x="44" y="48" width="248" height="130" rx="8" fill="#E8F0F7" stroke="#10253A" strokeWidth="2.5" />
        <rect x="40" y="40" width="256" height="14" rx="4" fill="#176B5B" />
        {/* Twin fans */}
        <rect x="60" y="66" width="114" height="96" rx="5" fill="#FFFFFF" stroke="#6B86A0" strokeWidth="1.5" />
        <circle cx="117" cy="114" r="36" fill="#EDF3F8" stroke="#17324D" strokeWidth="2.2" />
        <path d="M117 81 C124 94, 124 104, 117 114 C127 107, 137 107, 150 114 C137 121, 127 121, 117 114 C124 124, 124 134, 117 147 C110 134, 110 124, 117 114 C107 121, 97 121, 84 114 C97 107, 107 107, 117 114 C110 104, 110 94, 117 81 Z" fill="#176B5B" />
        {/* Condensate tray & pipe */}
        <rect x="188" y="66" width="88" height="44" rx="4" fill="#D5E2EE" stroke="#6B86A0" strokeWidth="1.5" />
        <line x1="196" y1="78" x2="268" y2="78" stroke="#4D6B88" strokeWidth="3" />
        <line x1="196" y1="88" x2="268" y2="88" stroke="#4D6B88" strokeWidth="3" />
        <line x1="196" y1="98" x2="268" y2="98" stroke="#4D6B88" strokeWidth="3" />
        {/* Drain pipe + simulated drip highlight */}
        <path d="M266 154 L318 154 L318 184" fill="none" stroke="#B76A12" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="318" cy="193" r="4" fill="#F2B84B" />
        {/* Digital panel */}
        <rect x="188" y="118" width="88" height="44" rx="4" fill="#17324D" />
        <rect x="196" y="126" width="46" height="18" rx="2" fill="#176B5B" />
        <text x="201" y="139" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">11.4°C</text>
        {/* Hotspot markers */}
        <circle cx="117" cy="70" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="117" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">01</text>
        <circle cx="318" cy="154" r="12" fill="#D9822B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="318" y="158" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">02</text>
        <circle cx="268" cy="126" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="268" y="130" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">03</text>
        {/* Simulated field evidence thumbnail inset */}
        <rect x="310" y="24" width="92" height="92" rx="8" fill="#FFFFFF" stroke="#DCE4EC" strokeWidth="2" />
        <rect x="317" y="31" width="78" height="54" rx="4" fill="#FEF3F2" stroke="#F4C7C3" strokeWidth="1" />
        <path d="M326 66 Q355 58 386 68" fill="none" stroke="#B42318" strokeWidth="3" />
        <circle cx="356" cy="74" r="5" fill="#B42318" opacity="0.7" />
        <text x="356" y="102" textAnchor="middle" fill="#17324D" fontSize="9" fontWeight="bold">Foto Dreno</text>
      </svg>
    );
  }

  if (scenarioId === 'guide-comp') {
    return (
      <svg viewBox="0 0 420 230" className="h-full w-full" aria-label="Diagrama ilustrativo de inspeção em Compressor">
        <rect width="420" height="230" rx="10" fill="#17324D" />
        <rect x="0" y="180" width="420" height="50" fill="#27435E" />
        {/* Compressor tank */}
        <rect x="48" y="112" width="246" height="62" rx="31" fill="#DCE8F4" stroke="#0F2438" strokeWidth="2.5" />
        <line x1="84" y1="124" x2="256" y2="124" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" strokeLinecap="round" />
        {/* Motor housing */}
        <rect x="74" y="48" width="118" height="64" rx="7" fill="#176B5B" stroke="#0F2438" strokeWidth="2.2" />
        {/* Piping & Pressure gauge */}
        <path d="M192 80 L256 80 L256 112" fill="none" stroke="#DCE4EC" strokeWidth="6" strokeLinejoin="round" />
        <circle cx="256" cy="64" r="24" fill="#FFFFFF" stroke="#0F2438" strokeWidth="2.5" />
        <line x1="256" y1="64" x2="269" y2="52" stroke="#176B5B" strokeWidth="3" strokeLinecap="round" />
        <text x="256" y="80" textAnchor="middle" fill="#17324D" fontSize="9" fontFamily="monospace" fontWeight="bold">7.5 bar</text>
        {/* Drain valve at bottom */}
        <rect x="158" y="174" width="26" height="14" rx="2" fill="#D9822B" />
        {/* Hotspots */}
        <circle cx="256" cy="40" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="256" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">01</text>
        <circle cx="216" cy="80" r="12" fill="#D9822B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="216" y="84" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">02</text>
        <circle cx="171" cy="186" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="171" y="190" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">03</text>
        {/* Inset photo box */}
        <rect x="310" y="24" width="92" height="92" rx="8" fill="#FFFFFF" />
        <rect x="317" y="31" width="78" height="54" rx="4" fill="#FEF6EB" stroke="#F2D3AA" strokeWidth="1" />
        <circle cx="356" cy="58" r="14" fill="none" stroke="#B76A12" strokeWidth="2.5" />
        <text x="356" y="102" textAnchor="middle" fill="#17324D" fontSize="9" fontWeight="bold">Separador</text>
      </svg>
    );
  }

  if (scenarioId === 'guide-power') {
    return (
      <svg viewBox="0 0 420 230" className="h-full w-full" aria-label="Diagrama ilustrativo de inspeção elétrica QGBT">
        <rect width="420" height="230" rx="10" fill="#17324D" />
        <rect x="0" y="186" width="420" height="44" fill="#27435E" />
        {/* Cabinet */}
        <rect x="76" y="24" width="186" height="162" rx="6" fill="#E3EBF3" stroke="#0F2438" strokeWidth="2.5" />
        <rect x="90" y="38" width="158" height="134" rx="4" fill="#FFFFFF" stroke="#8FA7BE" strokeWidth="1.5" />
        {/* Main 400A breaker */}
        <rect x="104" y="52" width="60" height="38" rx="3" fill="#17324D" />
        <rect x="112" y="64" width="18" height="10" rx="1.5" fill="#D9822B" />
        <rect x="174" y="52" width="60" height="38" rx="3" fill="#176B5B" />
        <text x="204" y="75" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">220V</text>
        {/* Grounding copper bar */}
        <rect x="104" y="136" width="130" height="12" rx="2" fill="#D9822B" />
        <polygon points="122,102 136,126 108,126" fill="#F2B84B" stroke="#17324D" strokeWidth="1.5" />
        {/* Hotspots */}
        <circle cx="90" cy="40" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="90" y="44" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">01</text>
        <circle cx="134" cy="52" r="12" fill="#D9822B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="134" y="56" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">02</text>
        <circle cx="224" cy="142" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
        <text x="224" y="146" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">03</text>
        {/* Inset meter card */}
        <rect x="296" y="28" width="104" height="94" rx="8" fill="#FFFFFF" />
        <rect x="304" y="36" width="88" height="52" rx="4" fill="#17324D" />
        <text x="348" y="66" textAnchor="middle" fill="#4ADE80" fontSize="13" fontFamily="monospace" fontWeight="bold">24.2V CC</text>
        <text x="348" y="106" textAnchor="middle" fill="#17324D" fontSize="9" fontWeight="bold">Leitura Painel</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 230" className="h-full w-full" aria-label="Diagrama ilustrativo de inspeção de Empilhadeira">
      <rect width="420" height="230" rx="10" fill="#17324D" />
      <rect x="0" y="180" width="420" height="50" fill="#27435E" />
      {/* Floor bay markings */}
      <rect x="44" y="180" width="240" height="6" fill="#F2B84B" />
      {/* Forklift */}
      <rect x="74" y="102" width="114" height="60" rx="8" fill="#F2B84B" stroke="#0F2438" strokeWidth="2.5" />
      <path d="M92 102 L104 44 L168 44 L178 102" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinejoin="round" />
      <rect x="118" y="34" width="14" height="10" rx="3" fill="#D9822B" />
      <rect x="192" y="36" width="14" height="134" rx="3" fill="#CBD8E6" stroke="#0F2438" strokeWidth="2" />
      <rect x="206" y="148" width="82" height="10" rx="2" fill="#DCE4EC" />
      <circle cx="98" cy="166" r="18" fill="#0F2438" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="166" cy="166" r="18" fill="#0F2438" stroke="#FFFFFF" strokeWidth="2" />
      {/* Hotspots */}
      <circle cx="104" cy="116" r="12" fill="#B42318" stroke="#FFFFFF" strokeWidth="2" />
      <text x="104" y="120" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">01</text>
      <circle cx="166" cy="166" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
      <text x="166" y="170" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">02</text>
      <circle cx="125" cy="36" r="12" fill="#176B5B" stroke="#FFFFFF" strokeWidth="2" />
      <text x="125" y="40" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">03</text>
      {/* Inset check card */}
      <rect x="304" y="28" width="96" height="94" rx="8" fill="#FFFFFF" />
      <rect x="312" y="36" width="80" height="52" rx="4" fill="#ECF7EE" stroke="#CBE4D3" strokeWidth="1" />
      <text x="352" y="66" textAnchor="middle" fill="#137333" fontSize="12" fontWeight="bold">Aprovado</text>
      <text x="352" y="106" textAnchor="middle" fill="#17324D" fontSize="9" fontWeight="bold">Teste em pátio</text>
    </svg>
  );
};

export const InspectionGuideSection: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(SCENARIOS[0].id);
  const current = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0];

  return (
    <section
      id="guia-manutencao"
      className="border-y border-[#DCE4EC] bg-white py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#176B5B]">
            Guia simulado de manutenção em campo
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#17324D] sm:text-3xl">
            O que o técnico confere na frente de cada máquina
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#476078]">
            Selecione uma família de equipamento abaixo para visualizar os
            pontos críticos ilustrados, faixas nominais de leitura e um exemplo
            real de registro com foto.
          </p>
        </div>

        <div
          className="mt-6 inline-flex flex-wrap gap-1.5 rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-1.5"
          role="tablist"
          aria-label="Categorias do guia ilustrado de manutenção"
        >
          {SCENARIOS.map((sc) => {
            const isSelected = sc.id === current.id;
            return (
              <button
                key={sc.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveId(sc.id)}
                className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-[#17324D] text-white shadow-sm'
                    : 'text-[#476078] hover:text-[#17324D]'
                }`}
              >
                {sc.category}
              </button>
            );
          })}
        </div>

        {/* Rich Illustrated Split Card */}
        <div className="mt-8 grid grid-cols-1 items-stretch gap-8 rounded-2xl border border-[#DCE4EC] bg-[#F4F7FA] p-5 sm:p-7 lg:grid-cols-12">
          {/* Left Visual Diagram & Sample Evidence */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-[#23415C] bg-[#13293D] shadow-md">
              <div className="flex items-center justify-between border-b border-[#23415C] bg-[#0E2235] px-4 py-2.5 text-[11px] font-medium text-[#CBD7E4]">
                <span className="font-mono font-semibold text-[#5EEAD4]">
                  DIAGRAMA TÉCNICO · {current.code}
                </span>
                <span>3 pontos de verificação em campo</span>
              </div>
              <div className="p-2">
                <GuideSceneDiagram scenarioId={current.id} />
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                current.sampleFinding.status === 'non_conforming'
                  ? 'border-[#F4C7C3] bg-white'
                  : 'border-[#CBE4D3] bg-white'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    current.sampleFinding.status === 'non_conforming'
                      ? 'text-[#B42318]'
                      : 'text-[#137333]'
                  }`}
                >
                  {current.sampleFinding.status === 'non_conforming' ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {current.sampleFinding.title}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#526980]">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {current.sampleFinding.evidenceCaption}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#35506B]">
                {current.sampleFinding.note}
              </p>
            </div>
          </div>

          {/* Right Technical Instructions & Direct Test CTAs */}
          <div className="flex flex-col justify-between rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-6 lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#526980]">
                <span className="font-mono font-bold text-[#176B5B]">
                  Ativo modelo: {current.code}
                </span>
                <span>{current.frequency}</span>
              </div>

              <h3 className="mt-2 text-xl font-bold text-[#17324D]">
                {current.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#476078]">
                {current.subtitle}
              </p>

              <div className="mt-4 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] px-3.5 py-2.5 font-mono text-xs font-medium text-[#17324D]">
                Parâmetro de referência: {current.toleranceSpec}
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#526980]">
                  Pontos de verificação numerados no diagrama
                </p>
                {current.checkpoints.map((cp) => (
                  <div
                    key={cp.num}
                    className="flex items-start gap-3 rounded-lg border border-[#DCE4EC] p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#17324D] font-mono text-xs font-bold text-white">
                      {cp.num}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#17324D]">
                        {cp.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[#476078]">{cp.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE4EC] pt-4">
              <Link
                to={`/a/${current.assetId}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#DCE4EC] bg-white px-4 py-2 text-xs font-semibold text-[#17324D] hover:bg-[#F4F7FA] whitespace-nowrap"
              >
                <Smartphone className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
                Ver ficha móvel ({current.code})
              </Link>
              <Link
                to={`/a/${current.assetId}/inspect`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548] whitespace-nowrap"
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Simular inspeção agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
