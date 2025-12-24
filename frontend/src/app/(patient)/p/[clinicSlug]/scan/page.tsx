"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getClinicStatus } from "@/lib/api";

interface ScanPageProps {
  params: Promise<{
    clinicSlug: string;
  }>;
}

export default function ScanPage({ params }: ScanPageProps) {
  const router = useRouter();
  const [clinicSlug, setClinicSlug] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "getting-location" | "ready" | "creating" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clinicStatus, setClinicStatus] = useState<any>(null);

  useEffect(() => {
    params.then((p) => setClinicSlug(p.clinicSlug));
  }, [params]);

  useEffect(() => {
    if (!clinicSlug) return;

    async function initialize() {
      try {
        setStatus("loading");
        const status = await getClinicStatus(clinicSlug);
        setClinicStatus(status);

        if (!status.qrActive) {
          setError("QR code is not active for this clinic");
          setStatus("error");
          return;
        }

        // Check if any doctor is IN
        const hasDoctorIn = status.doctors?.some(
          (d: any) => String(d?.status || "").trim().toUpperCase() === "IN"
        );

        if (!hasDoctorIn) {
          setError("Doctor is currently OUT. Please try again later.");
          setStatus("error");
          return;
        }

        // Try to get location automatically
        setStatus("getting-location");
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0,
                }
              );
            });
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          } catch (locationError: any) {
            // Location is optional, continue without it
            console.warn("Location access failed, continuing without location:", locationError);
          }
        }

        setStatus("ready");
      } catch (err: any) {
        console.error("Error initializing:", err);
        setError(err.message || "Failed to initialize. Please try again.");
        setStatus("error");
      }
    }

    initialize();
  }, [clinicSlug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters)");
      return;
    }

    if (!phone.trim() || !/^[0-9]{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setStatus("creating");
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
      
      const requestBody: any = {
        patient: {
          name: name.trim(),
          phone: phone.trim(),
        },
      };

      if (location) {
        requestBody.location = location;
      }

      const response = await fetch(`${API_BASE_URL}/public/${clinicSlug}/tokens/auto-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setStatus("ready");
        return;
      }

      // Redirect to token status page
      if (result.tokenPublicId) {
        router.push(`/p/${clinicSlug}/token/${result.tokenPublicId}`);
      } else {
        setError("Token created but no public ID returned");
        setStatus("ready");
      }
    } catch (err: any) {
      console.error("Error creating token:", err);
      setError(err.message || "Failed to create token. Please try again.");
      setStatus("ready");
    }
  }

  if (status === "loading" || status === "getting-location") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent"></div>
          <p className="text-base text-slate-200">
            {status === "loading" ? "Checking clinic status..." : "Getting your location..."}
          </p>
          {status === "getting-location" && (
            <p className="mt-2 text-sm text-slate-400">Please allow location access</p>
          )}
        </div>
      </main>
    );
  }

  if (status === "creating") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-400 border-r-transparent"></div>
          <p className="text-base text-slate-200">Creating your token...</p>
          <p className="mt-2 text-sm text-slate-400">Adding you to the queue</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 text-center shadow-xl ring-1 ring-slate-700/50">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Unable to Create Token</h1>
          <p className="text-base text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/p/${clinicSlug}`)}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
          >
            Go to Manual Entry
          </button>
        </div>
      </main>
    );
  }

  if (status === "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Quick Token Registration</h1>
            <p className="text-sm text-slate-300">
              Enter your details to get a token and join the queue
            </p>
            {clinicStatus?.clinicName && (
              <p className="mt-2 text-xs text-slate-400">
                Clinic: <span className="font-semibold">{clinicStatus.clinicName}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-slate-600/50 bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-500/30"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(value);
                }}
                placeholder="10 digits only"
                className="w-full rounded-xl border border-slate-600/50 bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-500/30"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
            >
              Get My Token
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-slate-400">
            Your token will be automatically added to the queue
          </p>
        </div>
      </main>
    );
  }

  return null;
}

