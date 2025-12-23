"use client";

import { useState, useEffect } from "react";
import { getTokenStatus } from "@/lib/api";

interface TokenStatusPageProps {
  params: Promise<{
    clinicSlug: string;
    tokenId: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Waiting",
  CALLED: "Called - Please proceed",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  NO_SHOW: "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-blue-900/40 text-blue-300 border-blue-600/50",
  CALLED: "bg-emerald-900/40 text-emerald-300 border-emerald-600/50",
  IN_CONSULTATION: "bg-purple-900/40 text-purple-300 border-purple-600/50",
  COMPLETED: "bg-slate-700/40 text-slate-300 border-slate-600/50",
  EXPIRED: "bg-red-900/40 text-red-300 border-red-600/50",
  NO_SHOW: "bg-orange-900/40 text-orange-300 border-orange-600/50",
};

export default function TokenStatusPage({ params }: TokenStatusPageProps) {
  const [clinicSlug, setClinicSlug] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setClinicSlug(p.clinicSlug);
      setTokenId(p.tokenId);
    });
  }, [params]);

  useEffect(() => {
    if (!clinicSlug || !tokenId) return;

    // Initial fetch
    getTokenStatus(clinicSlug, tokenId)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTokenData(data);
        }
      })
      .catch((err) => setError(err.message));

    // Poll every 5 seconds
    const interval = setInterval(() => {
      getTokenStatus(clinicSlug, tokenId)
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setTokenData(data);
          }
        })
        .catch((err) => setError(err.message));
    }, 5000);

    return () => clearInterval(interval);
  }, [clinicSlug, tokenId]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 text-center shadow-xl ring-1 ring-slate-700/50">
          <p className="text-base text-red-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!tokenData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="text-base text-slate-200">Loading...</div>
      </main>
    );
  }

  const status = tokenData.status || "WAITING";
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.WAITING;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 text-center shadow-xl ring-1 ring-slate-700/50">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            NMC ClinicSaathi
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Clinic: <span className="font-semibold text-white">{clinicSlug}</span>
          </p>
          {tokenData.specialist?.name && (
            <p className="mt-1 text-sm text-slate-300">
              Doctor: <span className="font-semibold text-white">{tokenData.specialist.name}</span>
            </p>
          )}
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Your token number
          </p>
          <p className="mt-3 text-6xl font-bold text-white">
            {tokenData.tokenNumber || tokenId}
          </p>
        </div>

        <div className={`mt-6 rounded-xl border-2 p-5 text-base ${statusColor}`}>
          <p className="font-semibold">Status: {statusLabel}</p>
          {status === "WAITING" && (
            <p className="mt-2 text-sm opacity-80">
              Please wait. Your token will be called soon.
            </p>
          )}
          {status === "CALLED" && (
            <p className="mt-2 text-sm opacity-80">
              Please proceed to the consultation room.
            </p>
          )}
          {status === "IN_CONSULTATION" && (
            <p className="mt-2 text-sm opacity-80">
              Your consultation is in progress.
            </p>
          )}
          {status === "COMPLETED" && (
            <p className="mt-2 text-sm opacity-80">
              Your consultation is complete. Thank you!
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Please keep this page open. Your token is valid for today only.
        </p>
      </div>
    </main>
  );
}
