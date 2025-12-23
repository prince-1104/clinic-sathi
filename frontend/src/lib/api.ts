const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

type LoginResponse =
  | {
      accessToken: string;
      practitioner: {
        id: string;
        name: string;
        email: string;
        role: string;
        tenantId: string;
        tenantSlug: string;
      };
    }
  | { error: string };

export async function loginDoctor(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error("Unable to sign in. Please try again.");
  }

  const data = (await res.json()) as LoginResponse;

  if ("error" in data) {
    throw new Error(data.error || "Invalid credentials.");
  }

  return data;
}

// Patient QR APIs
export async function getClinicStatus(clinicSlug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/public/${clinicSlug}/status`);
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = "Failed to fetch clinic status";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    const data = await res.json();
    console.log("getClinicStatus API response:", data);
    return data;
  } catch (error: any) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error.name === "TypeError" || error.message === "Failed to fetch") {
      throw new Error(
        `Cannot connect to the server. Please ensure the backend is running at ${API_BASE_URL}`
      );
    }
    throw error;
  }
}

export async function createToken(clinicSlug: string, data: {
  specialistId?: string;
  patient: {
    name: string;
    dob: string;
    phone: string;
    address?: string;
    email?: string;
    gender?: string;
  };
  location: { lat: number; lng: number };
}) {
  const res = await fetch(`${API_BASE_URL}/public/${clinicSlug}/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    // Handle validation errors from backend
    if (error.details && Array.isArray(error.details)) {
      const validationMessages = error.details
        .map((detail: { field: string; message: string }) => `${detail.field}: ${detail.message}`)
        .join(", ");
      throw new Error(`Validation failed: ${validationMessages}`);
    }
    throw new Error(error.error || "Failed to create token");
  }
  return res.json();
}

export async function getTokenStatus(clinicSlug: string, tokenPublicId: string) {
  const res = await fetch(`${API_BASE_URL}/public/${clinicSlug}/tokens/${tokenPublicId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch token status");
  }
  return res.json();
}

// Doctor APIs
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("clinicSaathiToken") : null;
  if (!token) {
    console.error("No token found in localStorage. Please log in again.");
    throw new Error("No authentication token available. Please log in.");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  return headers;
}

export async function getQueue(clinicSlug: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/queue`, {
    headers,
  });
  if (!res.ok) {
    console.error("Queue request failed:", res.status, res.statusText);
    const error = new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch queue");
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function callNextToken(clinicSlug: string, specialistId?: string) {
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/queue/call-next`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ specialistId }),
  });
  if (!res.ok) {
    throw new Error("Failed to call next token");
  }
  return res.json();
}

export async function setDoctorStatus(clinicSlug: string, status: "IN" | "OUT", specialistId?: string) {
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/doctor-status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, specialistId }),
  });
  if (!res.ok) {
    throw new Error("Failed to update doctor status");
  }
  return res.json();
}

export async function setQrStatus(clinicSlug: string, active: boolean) {
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/qr-status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    throw new Error("Failed to update QR status");
  }
  return res.json();
}

export async function getStats(clinicSlug: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/stats`, {
    headers,
  });
  if (!res.ok) {
    const error = new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch stats");
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function updateTokenStatus(clinicSlug: string, tokenId: string, status: string) {
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/tokens/${tokenId}/status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error("Failed to update token status");
  }
  return res.json();
}

// Patients & History APIs
export async function getPatients(clinicSlug: string, search?: string) {
  const headers = getAuthHeaders();
  const url = search
    ? `${API_BASE_URL}/tenants/${clinicSlug}/patients?search=${encodeURIComponent(search)}`
    : `${API_BASE_URL}/tenants/${clinicSlug}/patients`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const error = new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch patients");
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function getPatientWithHistory(clinicSlug: string, patientId: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tenants/${clinicSlug}/patients/${patientId}`, {
    headers,
  });
  if (!res.ok) {
    const error = new Error(res.status === 401 ? "Unauthorized" : "Failed to fetch patient");
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

