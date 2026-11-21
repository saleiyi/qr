import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { pilotApi } from '../services/pilotClient';
import type { PilotInvitation } from '../types/pilot';
import { AuthFrame, authButton, authInput, PasswordField } from './LoginPage';

export function ActivatePage() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [invitation, setInvitation] = useState<PilotInvitation | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    let alive = true;
    if (!token) {
      setError('Abra o link completo enviado pelo administrador.');
      setLoading(false);
      return;
    }
    pilotApi
      .invitation(token)
      .then((result) => {
        if (alive) {
          setInvitation(result.invitation);
          setName(result.invitation.name);
        }
      })
      .catch((reason) => {
        if (alive) setError(reason instanceof Error ? reason.message : 'Convite indisponível.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitation) return;
    setPending(true);
    setError(null);
    try {
      if (invitation.existingAccount) await pilotApi.login(invitation.email, password);
      await pilotApi.acceptInvitation(token, name.trim(), password);
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível ativar o acesso.');
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthFrame
      title="Seu acesso começa aqui."
      description="Ative seu convite para acompanhar os equipamentos e registrar as inspeções da sua empresa."
    >
      <h2 className="text-xl font-bold">Ativar convite</h2>
      {loading && (
        <p className="mt-5 flex items-center gap-2 text-sm text-[#526980]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Verificando convite…
        </p>
      )}
      {invitation && (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="rounded-xl border border-[#CBE4D3] bg-[#EEF7F2] p-4">
            <p className="font-semibold">{invitation.companyName}</p>
            <p className="mt-1 break-all text-sm text-[#526980]">{invitation.email}</p>
            <p className="mt-2 text-sm text-[#526980]">
              {invitation.existingAccount
                ? 'Confirme a senha da sua conta para aceitar o convite.'
                : 'Use pelo menos 12 caracteres para sua senha.'}
            </p>
          </div>
          <label className="block text-sm font-semibold">
            Seu nome
            <input
              className={authInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              disabled={pending}
            />
          </label>
          <PasswordField
            value={password}
            onChange={setPassword}
            newPassword={!invitation.existingAccount}
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#FFF2F0] p-3 text-sm leading-relaxed text-[#9C2A20]"
            >
              {error}
            </p>
          )}
          <button className={authButton} disabled={pending}>
            {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Ativar meu acesso
          </button>
        </form>
      )}
      {!loading && !invitation && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-[#FFF2F0] p-4 text-sm leading-relaxed text-[#9C2A20]"
        >
          {error} Solicite um novo convite ao administrador.
        </p>
      )}
      <a
        href="/login"
        className="mt-6 block text-sm font-semibold text-[#176B5B] underline underline-offset-4"
      >
        Já tenho acesso
      </a>
    </AuthFrame>
  );
}
