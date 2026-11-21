import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, QrCode, ShieldCheck } from 'lucide-react';
import { pilotApi, safeReturnPath } from '../services/pilotClient';
import { demoHref } from '../services/runtimeMode';

export const authInput =
  'mt-2 block min-h-12 w-full rounded-xl border border-[#B8C9D7] bg-white px-3.5 text-base text-[#17324D] outline-none focus:border-[#176B5B] focus:ring-2 focus:ring-[#176B5B]/20 disabled:bg-[#F4F7FA]';
export const authButton =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176B5B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#145A4D] disabled:cursor-wait disabled:opacity-60';

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F4F7FA] text-[#17324D]">
      <header className="border-b border-[#233E58] bg-[#0E2235] px-5 py-5 text-white">
        <a href="/" className="mx-auto flex max-w-6xl items-center gap-3 text-lg font-bold">
          <span className="rounded-lg bg-[#176B5B] p-2">
            <QrCode className="h-5 w-5" />
          </span>
          Tagronda
        </a>
      </header>
      <div className="mx-auto grid max-w-5xl items-start gap-10 px-5 py-10 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <section className="lg:pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176B5B]">
            Equipamentos · Inspeções · Histórico
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-[#526980]">{description}</p>
          <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-[#526980]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#176B5B]" />O acesso e os
            registros ficam vinculados à empresa que convidou você.
          </p>
        </section>
        <section className="rounded-2xl border border-[#DCE4EC] bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}

export function PasswordField({
  value,
  onChange,
  newPassword = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  newPassword?: boolean;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-semibold">
      {newPassword ? 'Crie sua senha' : 'Senha'}
      <span className="relative block">
        <input
          className={`${authInput} pr-14`}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={newPassword ? 12 : undefined}
          maxLength={128}
          autoComplete={newPassword ? 'new-password' : 'current-password'}
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1 mt-2 flex w-11 items-center justify-center rounded-lg text-[#526980] hover:bg-[#F4F7FA]"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await pilotApi.login(email.trim(), password);
      navigate(safeReturnPath(params.get('returnTo')), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthFrame
      title="Entre no ambiente da sua empresa."
      description="Acesse os equipamentos, faça inspeções pelo celular e acompanhe os registros da sua equipe."
    >
      <h2 className="text-xl font-bold">Acessar minha conta</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#526980]">
        Primeiro acesso? Abra o convite recebido do administrador para criar sua senha.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <label className="block text-sm font-semibold">
          E-mail
          <input
            className={authInput}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="username"
            required
            disabled={pending}
          />
        </label>
        <PasswordField value={password} onChange={setPassword} disabled={pending} />
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[#F1B7B1] bg-[#FFF2F0] p-3 text-sm leading-relaxed text-[#9C2A20]"
          >
            {error}
          </p>
        )}
        <button className={authButton} disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}Entrar
        </button>
      </form>
      <p className="mt-5 text-sm leading-relaxed text-[#526980]">
        Precisa recuperar o acesso? Solicite ajuda ao administrador da sua empresa.
      </p>
      <div className="mt-6 border-t border-[#DCE4EC] pt-5">
        <a
          href={demoHref()}
          className="text-sm font-semibold text-[#176B5B] underline underline-offset-4"
        >
          Conhecer a demonstração
        </a>
        <Link to="/" className="mt-3 block text-sm text-[#526980] underline underline-offset-4">
          Voltar ao site
        </Link>
      </div>
    </AuthFrame>
  );
}
