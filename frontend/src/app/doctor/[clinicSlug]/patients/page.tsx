"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPatients, getPatientWithHistory } from "@/lib/api";

interface PatientsPageProps {
  params: Promise<{
    clinicSlug: string;
  }>;
}

export default function PatientsPage({ params }: PatientsPageProps) {
  const router = useRouter();
  const [clinicSlug, setClinicSlug] = useState<string>("");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setClinicSlug(p.clinicSlug));
  }, [params]);

  useEffect(() => {
    if (!clinicSlug) return;

    // Check authentication
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("clinicSaathiToken");
      if (!storedToken) {
        router.push("/doctor/login");
        return;
      }
    }

    loadPatients();
  }, [clinicSlug, router]);

  useEffect(() => {
    if (!clinicSlug || !searchQuery) {
      loadPatients();
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchPatients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function loadPatients() {
    if (!clinicSlug) return;
    try {
      setLoading(true);
      console.log("Loading patients for clinic:", clinicSlug);
      const data = await getPatients(clinicSlug);
      console.log("Patients data received:", data);
      setPatients(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading patients:", err);
      if (err.status === 401) {
        localStorage.clear();
        window.location.href = "/doctor/login";
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchPatients() {
    if (!clinicSlug || !searchQuery.trim()) {
      loadPatients();
      return;
    }
    try {
      setLoading(true);
      const data = await getPatients(clinicSlug, searchQuery);
      setPatients(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      if (err.status === 401) {
        localStorage.clear();
        window.location.href = "/doctor/login";
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePatientClick(patientId: string) {
    try {
      const patient = await getPatientWithHistory(clinicSlug, patientId);
      setSelectedPatient(patient);
    } catch (err: any) {
      if (err.status === 401) {
        localStorage.clear();
        window.location.href = "/doctor/login";
        return;
      }
      setError(err.message);
    }
  }

  if (loading && patients.length === 0) {
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
            <li className="rounded-md px-3 py-2 text-slate-300 hover:bg-slate-700/50">
              <a href={`/doctor/${clinicSlug}/dashboard`}>Live Queue</a>
            </li>
            <li className="rounded-md bg-slate-700/50 px-3 py-2 text-white">Patients &amp; History</li>
            <li className="rounded-md px-3 py-2 text-slate-300">AI Avatar (config)</li>
          </ul>
        </nav>
      </aside>

      <section className="flex-1 p-4 md:p-8">
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-white">Patients &amp; History</h2>
          <p className="mt-1 text-sm text-slate-300">
            View patient records and visit history
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-600/50 bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
          {/* Patients List */}
          <div className="rounded-2xl bg-slate-800/90 backdrop-blur-sm p-4 shadow-md ring-1 ring-slate-700/50">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-600/50 bg-slate-700/60 backdrop-blur-sm px-4 py-2 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {patients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-600/50 bg-slate-700/30 p-4 text-sm text-slate-300 text-center">
                  {searchQuery ? "No patients found" : "No patients yet"}
                </div>
              ) : (
                patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientClick(patient.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      selectedPatient?.id === patient.id
                        ? "border-sky-500 bg-sky-900/40 backdrop-blur-sm"
                        : "border-slate-700/50 bg-slate-800/60 backdrop-blur-sm hover:bg-slate-700/50"
                    }`}
                  >
                    <p className="font-semibold text-white">{patient.name}</p>
                    <p className="mt-1 text-xs text-slate-300">{patient.phone}</p>
                    {patient.email && (
                      <p className="text-xs text-slate-400">{patient.email}</p>
                    )}
                    {patient.appointmentCount !== undefined && (
                      <p className="mt-1 text-xs text-slate-400">
                        {patient.appointmentCount} visit{patient.appointmentCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Patient Details & History */}
          <div className="rounded-2xl bg-slate-800/90 backdrop-blur-sm p-6 shadow-md ring-1 ring-slate-700/50">
            {selectedPatient ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white">{selectedPatient.name}</h3>
                  <div className="mt-2 space-y-1 text-sm text-slate-300">
                    <p>Phone: {selectedPatient.phone}</p>
                    {selectedPatient.email && <p>Email: {selectedPatient.email}</p>}
                    <p>DOB: {new Date(selectedPatient.dob).toLocaleDateString()}</p>
                    {selectedPatient.gender && <p>Gender: {selectedPatient.gender}</p>}
                    {selectedPatient.address && <p>Address: {selectedPatient.address}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-lg font-semibold text-white">Visit History</h4>
                  {selectedPatient.appointments && Array.isArray(selectedPatient.appointments) && selectedPatient.appointments.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPatient.appointments.map((appointment: any) => (
                        <div
                          key={appointment.id}
                          className="rounded-xl border border-slate-700/50 bg-slate-700/40 backdrop-blur-sm p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-white">
                                {new Date(appointment.visitDate).toLocaleDateString()}
                              </p>
                              {appointment.specialist && (
                                <p className="mt-1 text-sm text-slate-300">
                                  Doctor: {appointment.specialist.name}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-slate-400">
                                Status: {appointment.status}
                              </p>
                            </div>
                            {appointment.token && (
                              <div className="rounded-lg bg-emerald-900/50 px-2 py-1 text-xs font-semibold text-emerald-300">
                                Token #{appointment.token.tokenNumber}
                              </div>
                            )}
                          </div>
                          {appointment.diagnosis && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-200">Diagnosis:</p>
                              <p className="mt-1 text-sm text-slate-300">{appointment.diagnosis}</p>
                            </div>
                          )}
                          {appointment.prescription && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-200">Prescription:</p>
                              <p className="mt-1 text-sm text-slate-300">{appointment.prescription}</p>
                            </div>
                          )}
                          {appointment.notes && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-200">Notes:</p>
                              <p className="mt-1 text-sm text-slate-300">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-600/50 bg-slate-700/30 p-4 text-sm text-slate-300 text-center">
                      No visit history available
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-400">Select a patient to view details and history</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

