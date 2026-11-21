import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  QrCode,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { demoHref } from '../services/runtimeMode';
import { useAppState } from '../context/AppStateContext';
import { formatBRL, formatDateBR, formatRelativeDueBR } from '../utils/date';
import { computeAssetInspectionStatus } from '../utils/domainLogic';
import { AssetIllustration } from '../components/AssetIllustration';
import { InspectionGuideSection } from '../components/InspectionGuideSection';
import { QrCodeDisplay } from '../components/QrCodeDisplay';
import { InspectionStatusBadge, OperationalStatusBadge } from '../components/StatusBadge';

const FAQS = [
  {
    q: 'Os técnicos precisam instalar aplicativo para ler o QR Code?',
    a: 'Não. Ao apontar a câmera do celular para a etiqueta, a ficha do equipamento e o formulário de inspeção abrem diretamente no navegador móvel.',
  },
  {
    q: 'Como funciona a geração e impressão das etiquetas?',
    a: 'Você seleciona um ou vários equipamentos na lista, escolhe o tamanho da etiqueta e gera uma folha A4 pronta para impressão comum ou adesiva, além de poder baixar o QR Code em PNG.',
  },
  {
    q: 'Uma inspeção concluída fecha automaticamente pendências antigas?',
    a: 'Não. O status de agendamento da inspeção e as pendências abertas são controlados separadamente. Uma pendência só é encerrada quando alguém registra o tratamento realizado.',
  },
  {
    q: 'Este ambiente é conectado a um servidor real?',
    a: 'Esta é uma demonstração interativa executada integralmente no navegador. Novos equipamentos, importações CSV, rascunhos, inspeções e pendências ficam salvos no armazenamento local do seu dispositivo e podem ser restaurados a qualquer momento.',
  },
];

const HERO_EQUIPMENT_IDS = ['eq-001', 'eq-002', 'eq-005'];

export const LandingPage: React.FC = () => {
  const { state } = useAppState();
  const [previewAssetId, setPreviewAssetId] = useState<string>('eq-001');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedPlanNotice, setSelectedPlanNotice] = useState<string | null>(null);

  const heroAssets = HERO_EQUIPMENT_IDS.map((id) => state.assets.find((a) => a.id === id)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );

  const selectableAssets = heroAssets.length > 0 ? heroAssets : state.assets.slice(0, 3);

  const previewAsset = state.assets.find((a) => a.id === previewAssetId) ?? selectableAssets[0];
  const previewSite = state.sites.find((s) => s.id === previewAsset?.siteId);
  const previewTemplate = state.templates.find((t) => t.id === previewAsset?.templateId);
  const previewStatus = previewAsset
    ? computeAssetInspectionStatus(previewAsset, APP_CONFIG.demoClockDate)
    : 'ok';
  const previewOpenIssues = previewAsset
    ? state.issues.filter((i) => i.assetId === previewAsset.id && i.status !== 'resolved')
    : [];

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#17324D]">
      {/* Top Bar Contract: 3 zones only */}
      <header className="sticky top-0 z-30 border-b border-[#233E58] bg-[#0E2235]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B5B] text-white">
              <QrCode className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{APP_CONFIG.brandName}</span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#CBD7E4]"
            aria-label="Navegação da página inicial"
          >
            <a
              href="#guia-manutencao"
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Guia de manutenção
            </a>
            <a
              href="#fluxo"
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Fluxo
            </a>
            <a
              href="#planos"
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Planos
            </a>
            <a
              href="#duvidas"
              className="hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Dúvidas
            </a>
          </nav>

          <div className="shrink-0">
            <a
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#176B5B] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1D836F] whitespace-nowrap shrink-0"
            >
              Entrar
            </a>
          </div>
        </div>
      </header>

      {/* Dramatic Architectural Navy Hero */}
      <section className="relative overflow-hidden border-b border-[#233E58] bg-gradient-to-br from-[#0E2235] via-[#132C44] to-[#173854] text-white">
        {/* Blueprint grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(23,107,91,0.85) 0%, rgba(14,34,53,0) 70%)',
          }}
        />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-16">
          {/* Hero Value Proposition */}
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5EEAD4]">
              {APP_CONFIG.demoLabel} interativa · Etiquetas QR + Inspeção em campo
            </p>
            <h1 className="mt-3 text-[2.25rem] font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem] [text-wrap:balance]">
              Histórico e inspeções de cada equipamento, em um só lugar.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#CBD7E4] sm:text-lg">
              Cole etiquetas QR em chillers, compressores, quadros elétricos e empilhadeiras. O
              técnico escaneia no navegador do celular, executa o checklist e registra fotos; a
              gestão acompanha atrasos e pendências no painel.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href={demoHref('/app')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#176B5B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#081522]/40 hover:bg-[#1D836F] whitespace-nowrap"
              >
                <span>Explorar demonstração</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={demoHref('/a/eq-001')}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#3B5B78] bg-[#17324D]/75 px-5 py-3 text-sm font-semibold text-white hover:bg-[#1E4060] whitespace-nowrap"
              >
                <Smartphone className="h-4 w-4 text-[#5EEAD4]" aria-hidden="true" />
                <span>Abrir ficha no celular</span>
              </a>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#26435E] pt-5 text-xs text-[#9FB5CA]">
              <span>
                Exemplo:{' '}
                <strong className="font-semibold text-white">{state.company.tradeName}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#E2EBF3]">
                {state.assets.length} equipamentos
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#E2EBF3]">
                {state.sites.length} unidades
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#E2EBF3]">
                Base {formatDateBR(APP_CONFIG.demoClockDate)}
              </span>
            </div>
          </div>

          {/* Interactive Dual Industrial Equipment + Mobile Field Stage */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-[#2B4B69] bg-[#10263B]/90 p-4 shadow-2xl shadow-[#06101B]/50 sm:p-5">
              {/* Selector bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5">
                <span className="text-xs font-semibold text-[#CBD7E4]">
                  Estação conectada ao vivo ({APP_CONFIG.demoLabel})
                </span>
                <div className="inline-flex rounded-lg border border-[#2B4B69] bg-[#0B1B2B] p-1">
                  {selectableAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setPreviewAssetId(a.id)}
                      className={`rounded-md px-3 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                        previewAsset?.id === a.id
                          ? 'bg-[#176B5B] text-white'
                          : 'text-[#9FB5CA] hover:text-white'
                      }`}
                    >
                      {a.code}
                    </button>
                  ))}
                </div>
              </div>

              {previewAsset && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                  {/* Physical Machine + QR Plaque */}
                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#DCE4EC] bg-[#EEF3F8] p-4 text-[#17324D] sm:col-span-5">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#526980]">
                        <span>Placa do ativo</span>
                        <span className="font-mono text-[#17324D]">{previewAsset.code}</span>
                      </div>
                      <AssetIllustration
                        category={previewAsset.category}
                        code={previewAsset.code}
                        name={previewAsset.name}
                        photoDataUrl={previewAsset.photoDataUrl}
                        className="mt-2.5 h-36 w-full"
                        size="lg"
                      />
                      <div className="mt-2.5 rounded-lg border border-[#CBD7E4] bg-white/80 px-3 py-2 text-[11px]">
                        <p className="font-semibold text-[#17324D]">
                          {previewAsset.manufacturer} {previewAsset.model}
                        </p>
                        <p className="mt-0.5 text-[#526980]">
                          Ciclo: a cada {previewAsset.inspectionCycleDays} dias
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#CBD7E4] bg-white p-2.5">
                      <QrCodeDisplay
                        value={`${window.location.origin}${demoHref(`/a/${previewAsset.id}`)}`}
                        size={68}
                        label={`QR de ${previewAsset.code}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold text-[#17324D]">
                          {previewAsset.code}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[#476078]">
                          {previewSite?.name}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#176B5B]">
                          /a/{previewAsset.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Field Inspection Card */}
                  <div className="flex flex-col justify-between rounded-xl border border-[#DCE4EC] bg-white p-4 text-[#17324D] sm:col-span-7">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#526980]">
                        <span className="font-semibold text-[#176B5B]">
                          Ficha após leitura do QR
                        </span>
                        <span className="font-mono text-[11px]">{previewAsset.category}</span>
                      </div>
                      <h2 className="mt-1.5 text-base font-bold leading-snug text-[#17324D]">
                        {previewAsset.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#476078]">
                        {previewAsset.sector} · Série {previewAsset.serialNumber}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <OperationalStatusBadge status={previewAsset.operationalStatus} />
                        <InspectionStatusBadge status={previewStatus} />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-2.5 text-[11px]">
                        <div>
                          <span className="text-[#526980]">Última</span>
                          <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#17324D]">
                            {formatDateBR(previewAsset.lastInspectionAt)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#526980]">Janela</span>
                          <p className="mt-0.5 font-semibold tabular-nums text-[#17324D]">
                            {formatRelativeDueBR(
                              previewAsset.nextInspectionDue,
                              APP_CONFIG.demoClockDate,
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#526980]">Pendências</span>
                          <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#B42318]">
                            {previewOpenIssues.length} aberta(s)
                          </p>
                        </div>
                      </div>

                      {previewTemplate && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#526980]">
                            Itens do checklist ({previewTemplate.items.length})
                          </p>
                          {previewTemplate.items.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-[#DCE4EC] px-2.5 py-1.5 text-xs"
                            >
                              <span className="truncate text-[#17324D]">{item.label}</span>
                              <CheckCircle2
                                className="h-3.5 w-3.5 shrink-0 text-[#176B5B]"
                                aria-hidden="true"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#DCE4EC] pt-3">
                      <a
                        href={demoHref(`/app/assets/${previewAsset.id}`)}
                        className="text-xs font-semibold text-[#17324D] hover:text-[#176B5B] hover:underline"
                      >
                        Ficha no painel →
                      </a>
                      <a
                        href={demoHref(`/a/${previewAsset.id}/inspect`)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#125548] whitespace-nowrap"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Iniciar inspeção agora
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Simulated Field Maintenance Guide with Illustrated Equipment Diagrams */}
      <InspectionGuideSection />

      {/* Core Workflow: 3 steps */}
      <section id="fluxo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#176B5B]">
            Fluxo operacional
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#17324D] sm:text-3xl">
            Do código colado na máquina até o relatório arquivado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#476078]">
            Um fluxo direto para equipes de manutenção que hoje dependem de planilhas soltas ou
            formulários em papel.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-[#DCE4EC] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF4F1] text-[#176B5B]">
                <QrCode className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs font-bold text-[#526980]">ETAPA 01</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17324D]">
              Cadastre ou importe via CSV e imprima em A4
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#476078]">
              Suba sua lista de equipamentos em CSV com validação linha a linha, gere etiquetas com
              QR Code real e fixe no painel de cada ativo.
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE4EC] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF4F1] text-[#176B5B]">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs font-bold text-[#526980]">ETAPA 02</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17324D]">
              Identificação imediata e checklist no celular
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#476078]">
              O técnico abre a ficha móvel, confere o código e pendências anteriores, responde
              conforme ou não conforme e anexa foto da ocorrência.
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE4EC] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF4F1] text-[#176B5B]">
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs font-bold text-[#526980]">ETAPA 03</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#17324D]">
              Pendências rastreadas e relatórios em CSV ou PDF
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#476078]">
              Itens reprovados abrem pendências ligadas à inspeção original. Exporte registros
              filtrados ou imprima relatórios formatados em A4.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities & Use Cases */}
      <section id="recursos" className="border-y border-[#DCE4EC] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#176B5B]">
                Aplicação prática
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#17324D]">
                Pensado para a rotina real de oficinas, galpões e prédios
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#476078]">
                Separação clara entre o estado operacional do equipamento, o prazo da próxima
                inspeção e as pendências abertas — sem mascarar problemas não resolvidos.
              </p>

              <div className="mt-6 space-y-4 border-t border-[#DCE4EC] pt-6 text-sm">
                <div className="flex items-start gap-3">
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-[#176B5B]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#17324D]">
                      Manutenção industrial leve e utilidades
                    </p>
                    <p className="text-xs text-[#476078]">
                      Compressores, chillers, quadros QGBT, geradores e bancadas.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#176B5B]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#17324D]">
                      Logística, docas e movimentação interna
                    </p>
                    <p className="text-xs text-[#476078]">
                      Empilhadeiras elétricas, transpaleteiras e plataformas elevatórias.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileSpreadsheet
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#176B5B]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-[#17324D]">Gestão predial e multiunidades</p>
                    <p className="text-xs text-[#476078]">
                      Filtre pendências por unidade, responsável e período com exportação direta.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              <div className="rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-5">
                <h3 className="text-sm font-bold text-[#17324D]">Rascunho automático no campo</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#476078]">
                  Se o operador fechar o navegador durante a inspeção, o rascunho é recuperado ao
                  voltar ao equipamento.
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-5">
                <h3 className="text-sm font-bold text-[#17324D]">
                  Histórico imutável de respostas
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#476078]">
                  Editar um modelo de checklist hoje nunca altera as perguntas e respostas gravadas
                  em inspeções passadas.
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-5">
                <h3 className="text-sm font-bold text-[#17324D]">Importação CSV transparente</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#476078]">
                  Linhas inválidas ou códigos duplicados são apontados antes de gravar qualquer
                  registro na lista.
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE4EC] bg-[#F4F7FA] p-5">
                <h3 className="text-sm font-bold text-[#17324D]">
                  Etiquetas e relatórios prontos para impressão
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#476078]">
                  Estilos de impressão dedicados ocultam menus e organizam os dados em página A4
                  limpa para salvar em PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Pricing Section */}
      <section id="planos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#17324D]">
              Planos de referência (Demonstração)
            </h2>
            <p className="mt-1.5 text-sm text-[#476078]">
              Valores em R$ exibidos apenas para ilustrar o modelo comercial do protótipo — sem
              cobrança ou envio de pedido.
            </p>
          </div>
          <span className="rounded-md border border-[#DCE4EC] bg-white px-3 py-1.5 text-xs font-medium text-[#526980]">
            Ambiente de demonstração · Sem checkout
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {APP_CONFIG.demoPlans.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col justify-between overflow-hidden rounded-xl border bg-white ${
                plan.highlighted
                  ? 'border-[#176B5B] shadow-md ring-1 ring-[#176B5B]'
                  : 'border-[#DCE4EC]'
              }`}
            >
              {plan.highlighted && (
                <div className="bg-[#13293D] px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#5EEAD4]">
                  Configuração mais utilizada
                </div>
              )}
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="text-lg font-bold text-[#17324D]">{plan.name}</h3>
                  <p className="mt-1 text-xs text-[#526980]">{plan.audience}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-bold tabular-nums text-[#17324D]">
                      {formatBRL(plan.priceMonthlyBRL)}
                    </span>
                    <span className="text-xs text-[#526980]">/mês (ilustrativo)</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#35506B]">
                    {plan.assetsLimit} · {plan.usersLimit}
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-[#DCE4EC] pt-4 text-xs text-[#35506B]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#176B5B]"
                          aria-hidden="true"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPlanNotice(
                        `Plano "${plan.name}" (${formatBRL(plan.priceMonthlyBRL)}/mês) selecionado apenas para visualização nesta demonstração. Você pode testar todos os recursos livremente no painel.`,
                      )
                    }
                    className={`w-full min-h-[42px] rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-[#176B5B] text-white hover:bg-[#125548]'
                        : 'border border-[#DCE4EC] bg-white text-[#17324D] hover:bg-[#F4F7FA]'
                    }`}
                  >
                    Testar fluxo deste plano na demo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedPlanNotice && (
          <div
            role="status"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#CBE4D3] bg-[#ECF7EE] px-4 py-3 text-xs text-[#17324D]"
          >
            <span>{selectedPlanNotice}</span>
            <a
              href={demoHref('/app')}
              className="font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
            >
              Ir para o painel →
            </a>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="duvidas" className="border-t border-[#DCE4EC] bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#17324D]">Perguntas frequentes</h2>
          <div className="mt-6 divide-y divide-[#DCE4EC] border-y border-[#DCE4EC]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full min-h-[52px] items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-[#17324D] hover:text-[#176B5B]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#526980] transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-4 text-sm leading-relaxed text-[#476078]">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architectural Dark Footer */}
      <footer className="border-t border-[#233E58] bg-[#0E2235] py-8 text-[#CBD7E4]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 text-xs sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <span className="font-semibold text-white">{APP_CONFIG.brandName}</span> · Protótipo de
            demonstração em navegador (dados locais simulados, empresa fictícia{' '}
            {state.company.tradeName}).
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a href={demoHref('/app')} className="hover:text-white hover:underline">
              Painel
            </a>
            <a href={demoHref('/app/assets')} className="hover:text-white hover:underline">
              Equipamentos
            </a>
            <a href={demoHref('/a/eq-001')} className="hover:text-white hover:underline">
              Ficha móvel
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
