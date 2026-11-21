import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus, RotateCcw, Save } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { t } from '../i18n';
import type { UserRole } from '../types/domain';

export const SettingsPage: React.FC = () => {
  const {
    state,
    isPilot,
    demoSettings,
    setDemoSettings,
    updateCompany,
    addMember,
    updateMember,
    resetDemoData,
  } = useAppState();

  const [companyName, setCompanyName] = useState(state.company.name);
  const [tradeName, setTradeName] = useState(state.company.tradeName);
  const [cnpj, setCnpj] = useState(state.company.cnpj);
  const [city, setCity] = useState(state.company.city);
  const [contactEmail, setContactEmail] = useState(state.company.contactEmail);
  const [companyDirty, setCompanyDirty] = useState(false);
  useEffect(() => {
    if (companyDirty) return;
    setCompanyName(state.company.name);
    setTradeName(state.company.tradeName);
    setCnpj(state.company.cnpj);
    setCity(state.company.city);
    setContactEmail(state.company.contactEmail);
  }, [state.company, companyDirty]);

  const [newName, setNewName] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{ url: string; expiresAt?: string } | null>(null);
  const [invitePending, setInvitePending] = useState(false);

  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const isViewer = isPilot
    ? demoSettings.activeDemoRole !== 'admin'
    : demoSettings.activeDemoRole === 'viewer';

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateCompany({
      name: companyName.trim() || state.company.name,
      tradeName: tradeName.trim() || state.company.tradeName,
      cnpj: cnpj.trim(),
      city: city.trim(),
      contactEmail: contactEmail.trim(),
    });
    if (result.ok) setCompanyDirty(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setMemberError('Informe o nome completo e o e-mail do membro.');
      return;
    }
    setMemberError(null);
    setInvitePending(true);
    const res = await addMember({
      name: newName.trim(),
      jobTitle: newJobTitle.trim() || 'Técnico de Manutenção',
      email: newEmail.trim(),
      role: newRole,
      status: 'active',
    });
    if (res.ok) {
      if (res.invitationUrl) setInvitation({ url: res.invitationUrl, expiresAt: res.expiresAt });
      setNewName('');
      setNewJobTitle('');
      setNewEmail('');
      setNewRole('operator');
    } else setMemberError(res.error ?? 'Não foi possível criar o convite.');
    setInvitePending(false);
  };

  return (
    <AppShell
      title="Equipe e ajustes"
      subtitle={
        isPilot
          ? 'Dados da empresa e acesso da equipe'
          : 'Dados da organização de demonstração, membros locais e restauração do ambiente'
      }
    >
      <div className="max-w-4xl space-y-6">
        {invitation && (
          <section className="rounded-xl border border-[#CBE4D3] bg-[#EEF7F2] p-5">
            <h2 className="font-bold">Convite pronto para compartilhar</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#526980]">
              Este link é pessoal e só pode ser usado uma vez. Compartilhe diretamente com a pessoa
              convidada.
            </p>
            <label className="mt-3 block text-sm font-semibold">
              Link do convite
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-[#B8C9D7] bg-white px-3 text-sm"
                readOnly
                value={invitation.url}
                onFocus={(event) => event.target.select()}
              />
            </label>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-lg bg-[#176B5B] px-4 text-sm font-semibold text-white"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(invitation.url);
                } catch {
                  setMemberError('Selecione e copie o link do convite manualmente.');
                }
              }}
            >
              Copiar convite
            </button>
          </section>
        )}
        {isPilot && !isViewer && (
          <section className="rounded-xl border border-[#DCE4EC] bg-white p-5">
            <h2 className="font-bold">Cópia dos dados da empresa</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#526980]">
              Baixe equipamentos, inspeções e histórico para guardar uma cópia dos registros. As
              fotos permanecem protegidas pelo acesso da empresa.
            </p>
            <a
              href="/api/export"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#B8C9D7] px-4 text-sm font-semibold text-[#176B5B]"
            >
              Exportar dados da empresa
            </a>
          </section>
        )}
        {/* Company Profile */}
        <section className="rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-[#17324D]">
            {isPilot ? 'Dados da empresa' : 'Dados da empresa (Demonstração)'}
          </h2>
          <p className="mt-0.5 text-xs text-[#526980]">
            {isPilot
              ? 'Informações utilizadas nos relatórios e nas etiquetas da sua empresa.'
              : 'Empresa fictícia utilizada nos cabeçalhos de relatórios e etiquetas.'}
          </p>

          <form
            onSubmit={handleSaveCompany}
            onChange={() => setCompanyDirty(true)}
            data-cloud-command="company.update"
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="comp-name" className="block text-xs font-semibold text-[#476078]">
                  Razão social
                </label>
                <input
                  id="comp-name"
                  type="text"
                  disabled={isViewer}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                />
              </div>
              <div>
                <label htmlFor="comp-trade" className="block text-xs font-semibold text-[#476078]">
                  Nome de exibição no painel
                </label>
                <input
                  id="comp-trade"
                  type="text"
                  disabled={isViewer}
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                />
              </div>
              <div>
                <label htmlFor="comp-cnpj" className="block text-xs font-semibold text-[#476078]">
                  CNPJ (fictício)
                </label>
                <input
                  id="comp-cnpj"
                  type="text"
                  disabled={isViewer}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 font-mono text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                />
              </div>
              <div>
                <label htmlFor="comp-city" className="block text-xs font-semibold text-[#476078]">
                  Cidades de operação
                </label>
                <input
                  id="comp-city"
                  type="text"
                  disabled={isViewer}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DCE4EC] px-3 py-2 text-sm text-[#17324D] disabled:bg-[#F4F7FA]"
                />
              </div>
            </div>

            {!isViewer && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#176B5B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Salvar dados da empresa
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Team Members */}
        <section className="rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#17324D]">
                Equipe e perfis de acesso ({state.members.length})
              </h2>
              <p className="mt-0.5 text-xs text-[#526980]">
                {isPilot
                  ? 'Crie um convite e compartilhe o link diretamente com a pessoa. Cada membro define sua própria senha.'
                  : 'Cadastro salvo apenas localmente nesta demonstração (nenhum convite por e-mail é enviado).'}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[#DCE4EC]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE4EC] bg-[#F4F7FA] text-xs font-semibold text-[#476078]">
                  <th className="px-4 py-2.5">Membro</th>
                  <th className="px-4 py-2.5">Função</th>
                  <th className="px-4 py-2.5">Perfil</th>
                  <th className="px-4 py-2.5">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE4EC]">
                {state.members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#17324D]">{m.name}</p>
                      <p className="text-xs text-[#526980]">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#35506B]">{m.jobTitle}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Perfil de ${m.name}`}
                        disabled={isViewer}
                        value={m.role}
                        onChange={(e) => updateMember(m.id, { role: e.target.value as UserRole })}
                        className="rounded border border-[#DCE4EC] bg-white px-2.5 py-1 text-xs font-medium text-[#17324D] disabled:bg-[#F4F7FA]"
                      >
                        <option value="admin">{t.roles.admin}</option>
                        <option value="operator">{t.roles.operator}</option>
                        <option value="viewer">{t.roles.viewer}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      <span className={m.status === 'active' ? 'text-[#137333]' : 'text-[#526980]'}>
                        {m.invitationPending
                          ? 'Convite pendente'
                          : m.status === 'active'
                            ? 'Ativo'
                            : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isViewer && (
            <form
              onSubmit={handleAddMember}
              data-cloud-command="member.invite"
              className="mt-5 rounded-lg border border-[#DCE4EC] bg-[#F4F7FA] p-4"
            >
              <p className="text-xs font-semibold text-[#17324D]">
                {isPilot
                  ? 'Convidar membro da equipe'
                  : 'Adicionar membro localmente (somente demonstração)'}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo *"
                  aria-label="Nome do novo membro"
                  className="rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs text-[#17324D]"
                />
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="Cargo (ex.: Técnico)"
                  aria-label="Cargo do novo membro"
                  className="rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs text-[#17324D]"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="E-mail *"
                  aria-label="E-mail do novo membro"
                  className="rounded-lg border border-[#DCE4EC] bg-white px-3 py-2 text-xs text-[#17324D]"
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Perfil do novo membro"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="flex-1 rounded-lg border border-[#DCE4EC] bg-white px-2 text-xs text-[#17324D]"
                  >
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <button
                    type="submit"
                    disabled={invitePending}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#176B5B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#125548]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {isPilot ? 'Criar convite' : 'Incluir'}
                  </button>
                </div>
              </div>
              {memberError && (
                <p className="mt-2 text-xs font-medium text-[#B42318]" role="alert">
                  {memberError}
                </p>
              )}
              {invitePending && (
                <p role="status" className="mt-3 text-sm text-[#526980]">
                  Criando convite…
                </p>
              )}
            </form>
          )}
        </section>

        {/* Collapsible Demo Controls & Data Reset */}
        {!isPilot && (
          <section className="rounded-xl border border-[#DCE4EC] bg-white">
            <button
              type="button"
              aria-expanded={demoPanelOpen}
              onClick={() => setDemoPanelOpen((p) => !p)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <div>
                <h2 className="text-sm font-bold text-[#17324D]">
                  Controles de demonstração e restauração de dados
                </h2>
                <p className="text-xs text-[#526980]">
                  Teste estados de carregamento, base vazia, falha de gravação ou restaure os 26
                  equipamentos originais.
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-[#526980] transition-transform duration-150 ${
                  demoPanelOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {demoPanelOpen && (
              <div className="space-y-4 border-t border-[#DCE4EC] p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2.5 rounded-lg border border-[#DCE4EC] p-3 text-xs font-medium text-[#17324D]">
                    <input
                      type="checkbox"
                      checked={demoSettings.simulateLoading}
                      onChange={(e) =>
                        setDemoSettings((p) => ({
                          ...p,
                          simulateLoading: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#176B5B]"
                    />
                    Simular carregamento (esqueleto)
                  </label>

                  <label className="flex items-center gap-2.5 rounded-lg border border-[#DCE4EC] p-3 text-xs font-medium text-[#17324D]">
                    <input
                      type="checkbox"
                      checked={demoSettings.simulateEmptyState}
                      onChange={(e) =>
                        setDemoSettings((p) => ({
                          ...p,
                          simulateEmptyState: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#176B5B]"
                    />
                    Simular base vazia
                  </label>

                  <label className="flex items-center gap-2.5 rounded-lg border border-[#DCE4EC] p-3 text-xs font-medium text-[#17324D]">
                    <input
                      type="checkbox"
                      checked={demoSettings.simulateStorageError}
                      onChange={(e) =>
                        setDemoSettings((p) => ({
                          ...p,
                          simulateStorageError: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#B42318]"
                    />
                    Simular falha ao salvar
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F4C7C3] bg-[#FEF3F2]/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#17324D]">
                      Restaurar dados iniciais da demonstração
                    </p>
                    <p className="text-xs text-[#476078]">
                      Apaga modificações locais, rascunhos e retorna exatamente ao conjunto inicial
                      de exemplo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#B42318] px-4 py-2 text-xs font-semibold text-white hover:bg-[#911C13]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Restaurar dados iniciais
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Restaurar dados da demonstração?"
        description="Todos os equipamentos criados, edições, inspeções enviadas e rascunhos salvos no navegador serão substituídos pela base inicial de demonstração."
        confirmLabel="Confirmar restauração"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={async () => {
          await resetDemoData();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </AppShell>
  );
};
