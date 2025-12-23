"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginDoctor } from "@/lib/api";

export default function DoctorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@demo.clinic");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginDoctor(email, password);

      if (typeof window !== "undefined") {
        localStorage.setItem("clinicSaathiToken", result.accessToken);
        localStorage.setItem(
          "clinicSaathiPractitioner",
          JSON.stringify(result.practitioner),
        );
      }

      const clinicSlug = result.practitioner.tenantSlug || "demo-clinic";
      router.push(`/doctor/${clinicSlug}/dashboard`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            Doctor Login
          </h1>
          <p className="mt-2 text-base text-slate-300">
            Sign in to access your NMC ClinicSaathi dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-600/50 bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600/50 bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 transition-all"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

