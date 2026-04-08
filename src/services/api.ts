const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSmCbE1qUiHTtRrXYUkBPCiEH657eA4x-D6RE3APDCmHf8zhbCqozbN0S38W670x0/exec';

async function apiFetch(params: Record<string, any>) {
  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    cleanParams[key] = String(value);
  });
  
  const urlParams = new URLSearchParams({ ...cleanParams, _t: Date.now().toString() });
  const url = `${SCRIPT_URL}?${urlParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      return null;
    }
  } catch (error) {
    console.error(`API Fetch Error (${params.action}):`, error);
    throw error;
  }
}

export async function loginUser(email: string, pass: string) {
  try {
    const data = await apiFetch({ action: 'login', email, pass });
    return data || { success: false };
  } catch (error) {
    // Fallback for demo purposes if API is not ready
    if (email === 'maswardi75@gmail.com') {
      return {
        success: true,
        user: {
          name: "Ahmad Dani",
          role: "Admin Digital Concierge",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
        }
      };
    }
    return { success: false };
  }
}

export async function fetchAttendanceRecords(email?: string) {
  try {
    const data = await apiFetch({ action: 'getAttendance', email: email || '' });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchReportRecords(email?: string) {
  try {
    const data = await apiFetch({ action: 'getReports', email: email || '' });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchUsers() {
  try {
    const data = await apiFetch({ action: 'getUsers' });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function saveAttendance(data: { status: string; location: string; timestamp: string; email: string }) {
  try {
    await apiFetch({ action: 'saveAttendance', ...data });
    return true;
  } catch (error) {
    return false;
  }
}

export async function saveReport(data: { date: string; detail: string; output: string; email: string }) {
  try {
    await apiFetch({ action: 'saveReport', ...data });
    return true;
  } catch (error) {
    return false;
  }
}

export async function fetchSettings() {
  try {
    const data = await apiFetch({ action: 'getSettings' });
    return {
      office_lat: -7.729756740246309,
      office_lng: 111.26261833357766,
      allowed_radius: 50,
      nama_desa: '',
      nama_kecamatan: '',
      nama_kepala_desa: '',
      nama_sekretaris_desa: '',
      ...(data || {})
    };
  } catch (error) {
    return {
      office_lat: -7.729756740246309,
      office_lng: 111.26261833357766,
      allowed_radius: 50,
      nama_desa: '',
      nama_kecamatan: '',
      nama_kepala_desa: '',
      nama_sekretaris_desa: ''
    };
  }
}

export async function saveSettings(data: any) {
  try {
    await apiFetch({ action: 'saveSettings', ...data });
    return true;
  } catch (error) {
    return false;
  }
}
