import Image from "next/image";
import logoClaro from "@/logo_tvm.png";
import { crmAuthEnabled, configuredCrmUsers } from "@/lib/crm-users";
import { login } from "./actions";

export const metadata = { title: "Acceso al CRM | Tu Visa Mundo", robots: { index: false, follow: false } };

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const ready = crmAuthEnabled() && Boolean(process.env.AUTH_SECRET) && configuredCrmUsers().length > 0;
  return (
    <main className="login-page">
      <div className="login-card">
        <Image src={logoClaro} alt="Tu Visa Mundo" width={180} height={180} className="login-logo" priority />
        <h1>Acceso al CRM</h1>
        <p>Ingresa con la cuenta que te asignamos.</p>
        {ready ? (
          <form action={login}>
            <label htmlFor="username">Usuario</label>
            <input id="username" name="username" autoComplete="username" maxLength={40} required />
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            {error && <p className="login-error" role="alert">Usuario o contraseña incorrectos.</p>}
            <button className="button button--primary" type="submit">Entrar</button>
          </form>
        ) : <p className="login-error">El acceso privado aún no está configurado.</p>}
      </div>
    </main>
  );
}

