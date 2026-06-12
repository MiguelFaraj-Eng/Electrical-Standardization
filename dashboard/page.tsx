import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="dash-shell">
      <header className="dash-header">
        <span className="eyebrow">Technica Portal</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="ghost-btn">Sign out</button>
        </form>
      </header>
      <section className="dash-body">
        <h1>Welcome, {session.user.name ?? session.user.email}</h1>
        <p>You are signed in as {session.user.email}.</p>
        <p className="hint">Next features will live here.</p>
      </section>
    </main>
  );
}
