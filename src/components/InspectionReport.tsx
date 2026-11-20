import { APP_CONFIG } from '../config/appConfig';
import type { CompanyProfile, InspectionRecord, Issue, Site } from '../types/domain';
import { formatDateBR, formatDateTimeBR } from '../utils/date';

interface InspectionReportProps {
  records: InspectionRecord[];
  company: CompanyProfile;
  sites: Site[];
  issues: Issue[];
  dateFrom: string;
  dateTo: string;
}

export function InspectionReport({
  records,
  company,
  sites,
  issues,
  dateFrom,
  dateTo,
}: InspectionReportProps) {
  const siteNames = new Map(sites.map((site) => [site.id, site.name]));

  return (
    <div className="inspection-report mx-auto max-w-[210mm] space-y-6 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#17324D] pb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#526980]">
            Relatório de inspeções de equipamentos · {APP_CONFIG.demoLabel}
          </p>
          <h3 className="mt-1 break-words text-xl font-bold text-[#17324D]">
            {company.name}
          </h3>
          <p className="text-xs text-[#476078]">
            CNPJ {company.cnpj} · {company.city}
          </p>
        </div>
        <div className="text-xs text-[#476078] tabular-nums sm:text-right">
          <p>Emissão: {formatDateBR(APP_CONFIG.demoClockDate)}</p>
          <p>Registros incluídos: {records.length}</p>
          {(dateFrom || dateTo) && (
            <p>
              Período: {dateFrom ? formatDateBR(dateFrom) : 'Início'} até{' '}
              {dateTo ? formatDateBR(dateTo) : 'Atual'}
            </p>
          )}
        </div>
      </header>

      <div className="space-y-5">
        {records.map((record) => {
          const relatedIssues = issues.filter((issue) => issue.inspectionId === record.id);
          return (
            <article key={record.id} className="rounded-lg border border-[#DCE4EC] p-4 text-xs">
              <header className="report-record-header flex flex-wrap justify-between gap-3 border-b border-[#DCE4EC] pb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#176B5B]">{record.assetCodeSnapshot}</p>
                  <h4 className="mt-1 break-words text-base font-semibold text-[#17324D]">
                    {record.assetNameSnapshot}
                  </h4>
                  <p className="mt-1 text-[#526980]">
                    {siteNames.get(record.siteIdSnapshot) ?? record.siteIdSnapshot}
                  </p>
                  <p className="mt-0.5 break-words text-[#526980]">
                    Modelo: {record.templateNameSnapshot}
                    {` · v${record.templateVersion ?? 1}`}
                  </p>
                </div>
                <div className="text-[#476078] sm:text-right">
                  <p className={`font-semibold ${record.overallResult === 'approved' ? 'text-[#137333]' : 'text-[#B42318]'}`}>
                    {record.overallResult === 'approved'
                      ? 'Aprovada'
                      : `Com pendências (${record.nonConformingCount})`}
                  </p>
                  <p className="mt-1 tabular-nums">{formatDateTimeBR(record.submittedAt)}</p>
                  <p className="mt-0.5">{record.inspectorNameSnapshot}</p>
                  <p className="mt-0.5 break-all text-[11px] text-[#526980]">{record.id}</p>
                </div>
              </header>

              {record.generalNotes && (
                <section className="mt-3 border-l-2 border-[#176B5B] bg-[#F4F7FA] p-3">
                  <h5 className="font-semibold text-[#17324D]">Observações gerais</h5>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-[#476078]">
                    {record.generalNotes}
                  </p>
                </section>
              )}

              <div className="mt-3 space-y-2">
                {record.answers.map((answer) => (
                  <section key={answer.itemId} className="report-answer rounded-lg border border-[#DCE4EC] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-medium leading-relaxed text-[#17324D]">
                        {answer.label}
                        {answer.numericValue ? ` (${answer.numericValue} ${answer.unit ?? ''})` : ''}
                        {answer.value ? `: ${answer.type === 'date'?formatDateBR(answer.value):answer.value}` : ''}
                      </p>
                      <span className={`shrink-0 font-semibold ${
                        answer.status === 'conforming'
                          ? 'text-[#137333]'
                          : answer.status === 'non_conforming'
                            ? 'text-[#B42318]'
                            : 'text-[#526980]'
                      }`}>
                        {answer.status === 'conforming'
                          ? 'Conforme'
                          : answer.status === 'non_conforming'
                            ? 'Não conforme'
                            : 'N/A'}
                      </span>
                    </div>
                    {answer.note && (
                      <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-[#476078]">
                        {answer.note}
                      </p>
                    )}
                    {answer.photoDataUrl && (
                      <figure className="mt-3">
                        <img
                          src={answer.photoDataUrl}
                          alt={`Evidência: ${answer.label}`}
                          className="max-h-64 max-w-full rounded-md border border-[#DCE4EC] object-contain"
                        />
                        {answer.photoName && (
                          <figcaption className="mt-1 break-words text-[11px] text-[#526980]">
                            {answer.photoName}
                          </figcaption>
                        )}
                      </figure>
                    )}
                  </section>
                ))}
              </div>

              {relatedIssues.length > 0 && (
                <section className="mt-3 space-y-2 border-t border-[#DCE4EC] pt-3">
                  <h5 className="font-semibold text-[#17324D]">Tratamento das pendências</h5>
                  {relatedIssues.map((issue) => (
                    <div key={issue.id} className="report-answer break-words leading-relaxed text-[#476078]">
                      <p>
                        <strong>
                          {issue.status === 'resolved'
                            ? 'Resolvida'
                            : issue.status === 'awaiting_review'
                              ? 'Aguardando verificação'
                            : issue.status === 'in_progress'
                              ? 'Em tratamento'
                              : 'Aberta'}:
                        </strong>{' '}
                        {issue.description}
                      </p>
                      {issue.resolutionNote && (
                        <p className="mt-1 whitespace-pre-wrap">Tratamento: {issue.resolutionNote}</p>
                      )}
                      {issue.resolvedAt && (
                        <p className="mt-1 text-[11px]">Concluída em {formatDateTimeBR(issue.resolvedAt)}</p>
                      )}
                      {issue.treatmentPhotoDataUrl && <figure className="mt-2"><img src={issue.treatmentPhotoDataUrl} alt={`Tratamento: ${issue.title}`} className="max-h-64 max-w-full rounded-md object-contain" /><figcaption className="mt-1 text-[11px]">Evidência do tratamento</figcaption></figure>}
                    </div>
                  ))}
                </section>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
