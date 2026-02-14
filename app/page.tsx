"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(error ? "Email nao autorizado" : "");

  useEffect(() => {
    if (authDisabled) router.replace("/home");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoginError("Email ou senha incorretos");
      setLoading(false);
    } else {
      router.push("/home");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xs animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Home Strategy
          </h1>
          <p className="text-sm text-muted mt-1.5">
            O sistema operacional da casa
          </p>
        </div>

        {loginError && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200/60 dark:border-red-900/60">
            <p className="text-[13px] text-red-600 dark:text-red-400 text-center">
              {loginError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-foreground text-[14px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-foreground text-[14px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white text-[14px] font-medium hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-emerald-500/20 disabled:opacity-60 tap-highlight"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-muted text-center">
          Acesso restrito a membros da familia
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-muted border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
