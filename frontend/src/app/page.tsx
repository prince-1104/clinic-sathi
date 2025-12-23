"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function Home() {
  const doctorButtonRef = useRef<HTMLAnchorElement>(null);
  const patientButtonRef = useRef<HTMLAnchorElement>(null);
  const doctorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const patientTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("/p/demo-clinic");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setQrUrl(`${window.location.origin}/p/demo-clinic`);
    }
  }, []);

  const handleDoctorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (doctorTimeoutRef.current) {
      clearTimeout(doctorTimeoutRef.current);
    }
    
    
    doctorTimeoutRef.current = setTimeout(() => {
      if (doctorButtonRef.current) {
        window.open("/doctor/login", "_blank", "noopener,noreferrer");
      }
    }, 300);
  }, []);

  const handlePatientClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
  
    if (patientTimeoutRef.current) {
      clearTimeout(patientTimeoutRef.current);
    }
    
 
    patientTimeoutRef.current = setTimeout(() => {
      if (patientButtonRef.current) {
        window.open("/p/demo-clinic", "_blank", "noopener,noreferrer");
      }
    }, 300);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-800/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-700/50">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">
            NMC ClinicSaathi
          </h1>
          <p className="mt-2 text-base text-slate-300">
            Multi-tenant SaaS for QR-based clinic queues and patient management.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-700/50 bg-slate-700/40 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-500"></div>
              <h2 className="text-lg font-semibold text-white">For Doctors</h2>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Access your clinic dashboard to manage patient queues, tokens, and appointments.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                ref={doctorButtonRef}
                href="/doctor/login"
                onClick={handleDoctorClick}
                className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
              >
                Go to Login
              </a>
              <code className="rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 px-3 py-2 text-xs font-mono text-slate-300 shadow-sm">
                /doctor/&lt;clinicSlug&gt;/dashboard
              </code>
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-700/50 bg-slate-700/40 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <h2 className="text-lg font-semibold text-white">For Patients</h2>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Scan the clinic QR code to join the queue and get your token number instantly.
            </p>
            
            {/* QR Code Section */}
            <div className="mt-6 rounded-xl border-2 border-slate-600/50 bg-slate-700/60 backdrop-blur-sm p-6 text-center shadow-lg">
              <h3 className="mb-2 text-base font-semibold text-white">Scan to Book Appointment</h3>
              <p className="mb-4 text-xs text-slate-300">
                Point your camera at this QR code to open the appointment page
              </p>
              <div className="flex justify-center">
                <div className="rounded-xl border-4 border-white bg-white p-3 shadow-lg">
                  {isMounted && (
                    <QRCode
                      value={qrUrl}
                      size={180}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 180 180`}
                    />
                  )}
                </div>
              </div>
              <p className="mt-4 text-xs font-mono text-slate-400 break-all">
                {qrUrl}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                ref={patientButtonRef}
                href="/p/demo-clinic"
                onClick={handlePatientClick}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                Book Appointment
              </a>
              <code className="rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 px-3 py-2 text-xs font-mono text-slate-300 shadow-sm">
                /p/&lt;clinicSlug&gt;
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
