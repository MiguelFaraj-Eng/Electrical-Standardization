import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Technica International</p>
        <h1>Employee Portal</h1>
        <p className="hint">
          Sign in with your <strong>@technicaintl.com</strong> Microsoft account.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="ms-btn">
            <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
              <rect x="1" y="1" width="10" height="10" fill="#f25022" />
              <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
              <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
              <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </main>
  );
}
