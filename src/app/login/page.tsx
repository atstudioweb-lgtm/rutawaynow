"use client";
import { signIn } from "next-auth/react";
export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-sm text-slate-600">Acesse com sua conta Google para salvar seus planos e roteiros.</p>
        <button onClick={() => signIn("google", { callbackUrl: "/account" })} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500">Continuar com Google</button>
      </div>
    </main>
  );
}
