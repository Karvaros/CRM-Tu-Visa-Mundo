import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "node:crypto";
import { crmAuthEnabled, findCrmUser, verifyCrmPassword } from "@/lib/crm-users";

const credentialTag = (hash: string) => createHash("sha256").update(hash).digest("hex");

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  // The fallback is only used while the login is disabled; it cannot authorize any account.
  secret: process.env.AUTH_SECRET || (crmAuthEnabled() ? undefined : "crm-demo-auth-disabled-no-sessions-2026"),
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/acceso" },
  providers: [Credentials({
    credentials: {
      username: { label: "Usuario", type: "text" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      if (!crmAuthEnabled()) return null;
      const username = typeof credentials.username === "string" ? credentials.username.trim().toLowerCase() : "";
      const password = typeof credentials.password === "string" ? credentials.password : "";
      const user = verifyCrmPassword(username, password);
      return user ? { id: user.username, name: user.displayName } : null;
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const current = findCrmUser(user.id);
        token.credentialTag = current ? credentialTag(current.passwordHash) : undefined;
      }
      const current = typeof token.sub === "string" ? findCrmUser(token.sub) : null;
      if (!current || token.credentialTag !== credentialTag(current.passwordHash)) return null;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      return session;
    },
  },
});

