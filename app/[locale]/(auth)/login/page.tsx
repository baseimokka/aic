import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor) redirect("/en/dashboard");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="shadow-lift rounded-3xl border border-line bg-white p-8 sm:p-10">
          <Image src="/brand/aic-logo.png" alt="AIC Travel" width={118} height={32} priority />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
            Management Console
          </p>
          <h1 className="mt-6 font-serif text-[28px] font-medium text-ink">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Staff access only — accounts are created by a Super Admin.</p>
          <LoginForm next={next ?? null} />
        </div>
        <p className="mt-5 text-center text-xs text-faint">
          AIC Travel × SoHolidays · Official tourism partner
        </p>
      </div>
    </main>
  );
}
