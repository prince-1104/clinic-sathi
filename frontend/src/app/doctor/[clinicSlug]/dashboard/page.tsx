"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getQueue,
  callNextToken,
  setDoctorStatus,
  setQrStatus,
  getStats,
  updateTokenStatus,
  getClinicStatus,
} from "@/lib/api";

interface DashboardPageProps {
  params: Promise<{
    clinicSlug: string;
  }>;
}

export default function ClinicDashboardPage({ params }: DashboardPageProps) {
  const router = useRouter();
  const [clinicSlug, setClinicSlug] = useState<string>("");
  const [queue, setQueue] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, waiting: 0, completed: 0, expired: 0 });
  const [doctorIn, setDoctorIn] = useState(false);
  const [qrActive, setQrActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialStatusLoaded, setInitialStatusLoaded] = useState(false);
  const [specialistId, setSpecialistId] = useState<string | undefined>(undefined);

  useEffect(() => {
    params.then((p) => setClinicSlug(p.clinicSlug));
  }, [params]);

  useEffect(() => {
    // Check authentication immediately on mount
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("clinicSaathiToken");
      if (!storedToken) {
        console.warn("No authentication token found, redirecting to login");
        router.push("/doctor/login");
        return;
      }
      setToken(storedToken);
    }
  }, [router]);

  useEffect(() => {
    if (!clinicSlug) return;

    // Load initial data with full status
    loadData(true);

    // Poll queue every 10 seconds (reduced frequency, without status updates)
    const interval = setInterval(() => loadData(false), 10000);

    return () => clearInterval(interval);
  }, [clinicSlug]);

  async function loadData(isInitialLoad = false) {
    if (!clinicSlug) return;
    
    // Double-check token from localStorage (more reliable than state)
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("clinicSaathiToken") : null;
    if (!storedToken) {
      console.warn("No token found, redirecting to login");
      router.push("/doctor/login");
      return;
    }
    
    // Update token state if it's different
    if (storedToken !== token) {
      setToken(storedToken);
    }

    try {
      let queueData: any[] = [];
      
      // On initial load, fetch everything including clinic status
      // On subsequent polls, only fetch queue and stats (not clinic status to avoid auto-toggling)
      if (isInitialLoad) {
        const [fetchedQueue, statsData, clinicData] = await Promise.all([
          getQueue(clinicSlug).catch(() => []),
          getStats(clinicSlug).catch(() => ({ total: 0, waiting: 0, completed: 0, expired: 0 })),
          getClinicStatus(clinicSlug).catch(() => null),
        ]);

        queueData = fetchedQueue;
        setQueue(queueData);
        setStats(statsData);
        if (clinicData && !initialStatusLoaded) {
          // Only set status on first load, never override manual toggles
          setQrActive(clinicData.qrActive);
          // Get the first doctor/specialist ID for status updates
          // Handle both cases: specialists with IDs, or general status (id: null)
          if (clinicData.doctors && clinicData.doctors.length > 0) {
            const firstDoctor = clinicData.doctors[0];
            // Use the specialist ID if available, otherwise undefined (for general status)
            const firstSpecialistId = firstDoctor.id || undefined;
            setSpecialistId(firstSpecialistId);
            const hasDoctorIn = clinicData.doctors.some((d: any) => d.status === "IN") || false;
            console.log(`Initial load: Setting doctor status to ${hasDoctorIn ? 'IN' : 'OUT'}, specialistId: ${firstSpecialistId || 'null (general)'}`);
            setDoctorIn(hasDoctorIn);
          } else {
            // No doctors array, use null (general status)
            setSpecialistId(undefined);
            setDoctorIn(false);
            console.log(`Initial load: No doctors found, setting doctor status to OUT`);
          }
          setInitialStatusLoaded(true);
        } else if (clinicData && initialStatusLoaded) {
          // After initial load, don't update doctor status from API
          // Only update QR status if it changed
          if (clinicData.qrActive !== qrActive) {
            setQrActive(clinicData.qrActive);
          }
        }
      } else {
        // Polling: only fetch queue and stats, don't update doctor/QR status
        const [fetchedQueue, statsData] = await Promise.all([
          getQueue(clinicSlug).catch(() => []),
          getStats(clinicSlug).catch(() => ({ total: 0, waiting: 0, completed: 0, expired: 0 })),
        ]);

        queueData = fetchedQueue;
        setQueue(queueData);
        setStats(statsData);
      }

      // Find current patient (IN_CONSULTATION or CALLED)
      const inConsultation = queueData.find(
        (t: any) => t.status === "IN_CONSULTATION" || t.status === "CALLED",
      );
      setCurrentPatient(inConsultation || null);

      setLoading(false);
      setError(null);
    } catch (err: any) {
      // If 401, redirect to login immediately
      if (err.status === 401 || err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        console.error("Authentication failed. Clearing token and redirecting to login.");
        if (typeof window !== "undefined") {
          localStorage.removeItem("clinicSaathiToken");
          localStorage.removeItem("clinicSaathiPractitioner");
          // Redirect immediately
          window.location.href = "/doctor/login";
        }
        return;
      }
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleDoctorToggle() {
    if (!clinicSlug) return;
    const newStatus = doctorIn ? "OUT" : "IN";
    try {
      // Optimistically update UI first
      setDoctorIn(!doctorIn);
      // Then save to backend with the correct specialist ID (or undefined for general status)
      // If specialistId is not set yet, use undefined which will be converted to null (general status)
      await setDoctorStatus(clinicSlug, newStatus, specialistId);
      console.log(`Doctor status toggled to: ${newStatus}, specialistId: ${specialistId || 'null (general)'}`);
      setError(null);
    } catch (err: any) {
      // Revert on error
      setDoctorIn(doctorIn);
      setError(err.message);
      console.error("Failed to toggle doctor status:", err);
    }
  }

  async function handleQrToggle() {
    if (!clinicSlug) return;
    try {
      await setQrStatus(clinicSlug, !qrActive);
      setQrActive(!qrActive);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCallNext() {
    if (!clinicSlug) return;
    try {
      const result = await callNextToken(clinicSlug);
      if (result.error) {
        setError(result.message || "No tokens in queue");
      } else {
        setCurrentPatient(result);
        loadData(); // Refresh queue
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCompleteToken(tokenId: string) {
    if (!clinicSlug) return;
    try {
      await updateTokenStatus(clinicSlug, tokenId, "COMPLETED");
      setCurrentPatient(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
        return (
          <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
            <div className="text-base text-slate-200">Loading...</div>
          </main>
        );
  }

        return (
          <main className="flex min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
      <aside className="hidden w-64 border-r border-slate-700/50 bg-slate-800/80 backdrop-blur-sm p-4 md:block shadow-sm">
        <h1 className="text-lg font-semibold text-white">NMC ClinicSaathi</h1>
        <p className="mt-1 text-xs text-slate-400">Clinic: {clinicSlug}</p>
        <nav className="mt-6 space-y-2 text-sm">
          <div className="font-medium text-slate-300">Today</div>
          <ul className="space-y-1">
            <li className="rounded-md bg-slate-700/50 px-3 py-2 text-white">Live Queue</li>
            <li className="rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700/50">
              <a href={`/doctor/${clinicSlug}/patients`}>Patients &amp; History</a>
            </li>
            <li className="rounded-md px-3 py-2 text-slate-300">AI Avatar (config)</li>
          </ul>
        </nav>
      </aside>

      <section className="flex-1 p-4 md:p-8">
        <header className="flex flex-col gap-4 border-b border-slate-700/50 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Today&apos;s Queue</h2>
            <p className="mt-1 text-sm text-slate-300">
              Manage walk-in patients with QR-based tokens. Designed for simplicity and clarity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDoctorToggle}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                doctorIn
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              Doctor is {doctorIn ? "IN" : "OUT"}
            </button>
            <button
              onClick={handleQrToggle}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                qrActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              QR {qrActive ? "Active" : "Inactive"}
            </button>
            <button
              onClick={handleCallNext}
              disabled={queue.length === 0}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Call Next Token
            </button>
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-lg border border-red-600/50 bg-red-900/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1.5fr]">
          <div className="rounded-2xl bg-slate-800/90 backdrop-blur-sm p-4 shadow-md ring-1 ring-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Live Token Queue</h3>
            <p className="mt-1 text-xs text-slate-400">
              {queue.length} patient{queue.length !== 1 ? "s" : ""} waiting
            </p>
            <div className="mt-4 space-y-2">
              {queue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-600/50 bg-slate-700/30 p-4 text-sm text-slate-300">
                  No patients in queue
                </div>
              ) : (
                queue.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-700/40 backdrop-blur-sm p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Token #{token.tokenNumber}
                      </p>
                      {token.patient && (
                        <p className="text-xs text-slate-300">
                          {token.patient.name} • {token.patient.phone}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {token.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-800/90 backdrop-blur-sm p-4 shadow-md ring-1 ring-slate-700/50">
              <h3 className="text-sm font-semibold text-white">Current Patient</h3>
              {currentPatient ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Token #{currentPatient.tokenNumber}
                    </p>
                    {currentPatient.patient && (
                      <>
                        <p className="mt-1 text-xs text-slate-300">
                          {currentPatient.patient.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          DOB: {new Date(currentPatient.patient.dob).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          Phone: {currentPatient.patient.phone}
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleCompleteToken(currentPatient.id)}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Mark as Completed
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-600/50 bg-slate-700/30 p-4 text-sm text-slate-300">
                  No patient in consultation yet.
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-800/90 backdrop-blur-sm p-4 shadow-md ring-1 ring-slate-700/50">
              <h3 className="text-sm font-semibold text-white">Today&apos;s Summary</h3>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-lg bg-slate-700/40 backdrop-blur-sm p-3 shadow-sm">
                  <dt className="text-slate-400">Tokens issued</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{stats.total}</dd>
                </div>
                <div className="rounded-lg bg-slate-700/40 backdrop-blur-sm p-3 shadow-sm">
                  <dt className="text-slate-400">Completed</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{stats.completed}</dd>
                </div>
                <div className="rounded-lg bg-slate-700/40 backdrop-blur-sm p-3 shadow-sm">
                  <dt className="text-slate-400">Waiting</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">{stats.waiting}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
