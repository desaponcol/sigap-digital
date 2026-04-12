const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRHy2S1U89g4X_de2qSzlWrYHptrnmuqaR4JAuVkQtqN1sv-CHAzo2Fydz9nHGbqihVQ/exec';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbybQyFFcq4pU0h-M9jiKH7_-6xjirMn-d_hW9CIwE_YSQYsxRAX4FM97Ay0apBhysSu/exec';

// Fungsi untuk mendapatkan SCRIPT_URL secara dinamis dari Master API
async function getScriptUrl(): Promise<string> {
  const urlParams = new URLSearchParams(window.location.search);
  const villageCode = urlParams.get('v')?.toLowerCase();
  
  const savedCode = localStorage.getItem('sigap_village_code');
  const savedUrl = localStorage.getItem('sigap_script_url');

  // Jika ada kode desa baru di URL atau belum ada URL tersimpan, ambil dari Master
  if ((villageCode && villageCode !== savedCode) || !savedUrl) {
    const codeToFetch = villageCode || savedCode;
    
    if (codeToFetch) {
      try {
        const response = await fetch(`${MASTER_SCRIPT_URL}?action=getVillageConfig&code=${codeToFetch}`);
        const text = await response.text();
        const data = JSON.parse(text);
        
        if (data.success && data.config?.script_url) {
          localStorage.setItem('sigap_village_code', codeToFetch);
          localStorage.setItem('sigap_script_url', data.config.script_url);
          localStorage.setItem('sigap_village_name', data.config.name || '');
          return data.config.script_url;
        } else if (data.error) {
          console.error("Master API Error:", data.error);
          // Jika error (misal dinonaktifkan), kita tetap return savedUrl atau default 
          // tapi idealnya aplikasi menangani status non-aktif ini
        }
      } catch (e) {
        console.error("Failed to fetch village config from Master:", e);
      }
    }
  }

  return savedUrl || DEFAULT_SCRIPT_URL;
}

async function apiFetch(params: Record<string, any>) {
  const SCRIPT_URL = await getScriptUrl();
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
