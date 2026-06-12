import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const ALLOWED_DOMAIN = "technicaintl.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      // Single-tenant: only accounts in YOUR Azure tenant can sign in.
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    // Defense in depth: even within the tenant, require the company domain.
    signIn({ profile }) {
      const email = (profile?.email ?? profile?.preferred_username ?? "")
        .toString()
        .toLowerCase();
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
    authorized({ auth }) {
      // Used by middleware to protect routes.
      return !!auth?.user;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
