"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getClinicStatus, createToken } from "@/lib/api";
import QRCode from "react-qr-code";
import { patientSchema, type PatientFormData } from "@/lib/validation";

interface PatientEntryPageProps {
  params: Promise<{
    clinicSlug: string;
  }>;
}

export default function PatientEntryPage({ params }: PatientEntryPageProps) {
  const router = useRouter();
  const [clinicSlug, setClinicSlug] = useState<string>("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clinicStatus, setClinicStatus] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    dob?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    params.then((p) => {
      setClinicSlug(p.clinicSlug);
      
      // Initial fetch
      getClinicStatus(p.clinicSlug)
        .then((status) => {
          console.log("Setting clinic status:", status);
          setClinicStatus(status);
        })
        .catch((err) => {
          console.error("Error fetching clinic status:", err);
          setError(err.message);
        });
      
      // Poll every 10 seconds to check if doctor status changes
      const interval = setInterval(() => {
        getClinicStatus(p.clinicSlug)
          .then((status) => {
            console.log("Polling clinic status:", status);
            setClinicStatus(status);
          })
          .catch((err) => {
            console.error("Error polling clinic status:", err);
            // Don't set error on polling failures, just log
          });
      }, 10000);
      
      return () => clearInterval(interval);
    });
  }, [params]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLocationError(null);
    setValidationErrors({});
    setIsSubmitting(true);

    if (!clinicSlug) return;

    // Validate form data with Zod
    const formData: PatientFormData = {
      name,
      dob,
      phone,
    };

    const validationResult = patientSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const errors: { name?: string; dob?: string; phone?: string } = {};
      validationResult.error.issues.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        if (field === "name" || field === "dob" || field === "phone") {
          errors[field] = err.message;
        }
      });
      setValidationErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Get location
      let location: { lat: number; lng: number };
      
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (error) => {
              if (error.code === 1) {
                reject(new Error('Location access denied. Please allow location access to continue.'));
              } else if (error.code === 2) {
                reject(new Error('Location unavailable. Please check your device settings.'));
              } else if (error.code === 3) {
                reject(new Error('Location request timed out. Please try again.'));
              } else {
                reject(new Error('Failed to get location. Please try again.'));
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 15000, // 15 seconds
              maximumAge: 0, // Don't use cached location
            }
          );
        });

        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      } catch (locationError: any) {
        // For development: if location fails, show a clear error message
        setLocationError(locationError.message || 'Failed to get your location. Please ensure location services are enabled and try again.');
        setIsSubmitting(false);
        return;
      }

      // Create token with validated data
      const result = await createToken(clinicSlug, {
        patient: {
          name: validationResult.data.name,
          dob: validationResult.data.dob,
          phone: validationResult.data.phone,
        },
        location,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Redirect to token status page
      router.push(`/p/${clinicSlug}/token/${result.tokenPublicId}`);
    } catch (err: any) {
      if (err.code === 1) {
        setLocationError("Location access denied. Please allow location access to continue.");
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    }
  }

  // Check if any doctor is IN - calculate this before any early returns to avoid hooks violation
  // Use useMemo to memoize the calculation
  const hasDoctorIn = useMemo(() => {
    if (!clinicStatus?.doctors || !Array.isArray(clinicStatus.doctors) || clinicStatus.doctors.length === 0) {
      console.log("hasDoctorIn: false - no doctors array");
      return false;
    }
    
    const result = clinicStatus.doctors.some((d: any) => {
      const status = String(d?.status || "").trim().toUpperCase();
      const isIn = status === "IN";
      console.log(`Checking doctor ${d?.name}: status="${d?.status}" -> "${status}" -> isIn=${isIn}`);
      return isIn;
    });
    
    console.log("Final hasDoctorIn (useMemo):", result, "for doctors:", clinicStatus.doctors);
    if (result) {
      console.log("✅ Doctor is IN - showing form");
    } else {
      console.log("❌ Doctor is OUT - showing OUT message");
    }
    return result;
  }, [clinicStatus]);

  if (!clinicStatus) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="text-base text-slate-200">Loading...</div>
      </main>
    );
  }

  if (!clinicStatus.qrActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50 text-center">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">QR Not Active</h1>
          <p className="mt-3 text-base text-slate-300">
            This clinic is not currently accepting new tokens.
          </p>
        </div>
      </main>
    );
  }

  if (!hasDoctorIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50 text-center">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Doctor is Currently OUT</h1>
          <p className="mt-3 text-base text-slate-300">
            The doctor is currently not available. Please try again later.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            This page will automatically refresh when the doctor becomes available.
          </p>
        </div>
      </main>
    );
  }

  // Generate the full URL for the QR code
  const qrCodeUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/p/${clinicSlug}`
    : `/p/${clinicSlug}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Join the Queue</h1>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 border border-emerald-200">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-700">Doctor IN</span>
            </div>
          </div>
          <p className="mt-2 text-base text-slate-300">
            You are checking in at{" "}
            <span className="font-semibold text-white">{clinicStatus.clinicName || clinicSlug}</span>.
            Please keep this page open until your consultation is complete.
          </p>
        </div>

        {/* QR Code Section */}
        <section className="mb-6 rounded-xl border-2 border-slate-600/50 bg-slate-700/60 backdrop-blur-sm p-6 text-center shadow-md">
          <h2 className="mb-3 text-lg font-semibold text-white">Scan to Book Appointment</h2>
          <p className="mb-4 text-xs text-slate-300">
            Share this QR code with others to let them join the queue
          </p>
          <div className="flex justify-center">
            <div className="rounded-xl border-4 border-white bg-white p-4 shadow-lg">
              <QRCode
                value={qrCodeUrl}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 200 200`}
              />
            </div>
          </div>
          <p className="mt-4 text-xs font-mono text-slate-400 break-all">
            {qrCodeUrl}
          </p>
        </section>

        <section className="mb-6 space-y-3 rounded-xl border border-slate-700/50 bg-slate-700/40 backdrop-blur-sm p-4 text-sm text-slate-300 shadow-sm">
          <p className="font-semibold text-white">Before you start</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Allow location access so we can confirm you are at the clinic.</li>
            <li>No login is needed. We only ask for basic details.</li>
            <li>Your token will be valid for today&apos;s visit only.</li>
          </ul>
        </section>

        {(error || locationError) && (
          <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || locationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              className={`w-full rounded-xl border ${
                validationErrors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                  : "border-slate-600/50 focus:border-emerald-400 focus:ring-emerald-500/30"
              } bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2`}
            />
            {validationErrors.name && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Date of birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                // Clear validation error when user starts typing
                if (validationErrors.dob) {
                  setValidationErrors((prev) => ({ ...prev, dob: undefined }));
                }
              }}
              className={`w-full rounded-xl border ${
                validationErrors.dob
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                  : "border-slate-600/50 focus:border-emerald-400 focus:ring-emerald-500/30"
              } bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2`}
            />
            {validationErrors.dob && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.dob}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Mobile number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(value);
                // Clear validation error when user starts typing
                if (validationErrors.phone) {
                  setValidationErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
              placeholder="10 digits only"
              className={`w-full rounded-xl border ${
                validationErrors.phone
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                  : "border-slate-600/50 focus:border-emerald-400 focus:ring-emerald-500/30"
              } bg-slate-700/60 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2`}
            />
            {validationErrors.phone && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 transition-all"
          >
            {isSubmitting ? "Creating token..." : "Get my token"}
          </button>
        </form>
      </div>
    </main>
  );
}
