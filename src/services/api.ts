const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbys0cC1_mdc02-fv71jnfw9Pgfm6rSI57ZxNdpTYtUE9hPazn0eC86ofdc8NKaQ4qphww/exec';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbys0cC1_mdc02-fv71jnfw9Pgfm6rSI57ZxNdpTYtUE9hPazn0eC86ofdc8NKaQ4qphww/exec';

// Fungsi untuk mendapatkan SCRIPT_URL secara dinamis dari Master API
export async function initVillageConfig(): Promise<{success: boolean, error?: string}> {
  const urlParams = new URLSearchParams(window.location.search);
  const villageCode = urlParams.get('v')?.toLowerCase();
  
  // RESET CACHE jika MASTER_SCRIPT_URL berubah
  const lastMaster = localStorage.getItem('sigap_last_master_url');
  if (lastMaster !== MASTER_SCRIPT_URL) {
    localStorage.removeItem('sigap_script_url');
    localStorage.removeItem('sigap_village_code');
    localStorage.setItem('sigap_last_master_url', MASTER_SCRIPT_URL);
  }

  let currentCode = localStorage.getItem('sigap_village_code');
  let currentUrl = localStorage.getItem('sigap_script_url');

  // Jika ada kode desa baru di URL atau belum ada URL tersimpan, ambil dari Master
  if ((villageCode && villageCode !== currentCode) || !currentUrl) {
    const codeToFetch = villageCode || currentCode;
    
    if (codeToFetch) {
      try {
        // Gunakan proxy lokal untuk menghindari CORS
        const targetUrl = `${MASTER_SCRIPT_URL}?action=getVillageConfig&code=${codeToFetch}&_t=${Date.now()}`;
        const fetchUrl = `/api/proxy?url=${encodeURIComponent(MASTER_SCRIPT_URL)}&action=getVillageConfig&code=${codeToFetch}&_t=${Date.now()}`;
        
        const response = await fetch(fetchUrl);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const text = await response.text();
        
        if (text.includes('指令碼已完成') || text.includes('Script completed')) {
          return { success: false, error: "Script Master tidak mengembalikan data. Cek parameter." };
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Jika gagal parse, mungkin Google minta login atau error HTML
          console.error("Master response is not JSON:", text);
          return { success: false, error: "Izin Script Master Salah (Harus Anyone)" };
        }
        
        if (data.success && data.config?.script_url) {
          localStorage.setItem('sigap_village_code', codeToFetch);
          localStorage.setItem('sigap_script_url', data.config.script_url);
          localStorage.setItem('sigap_village_name', data.config.name || '');
          return { success: true };
        } else {
          return { success: false, error: data.error || "Desa tidak terdaftar di Master" };
        }
      } catch (e) {
        console.error("Master API Connection Failed:", e);
        return { success: false, error: "Koneksi Master Gagal (Cek Izin Script)" };
      }
    }
  }

  return { success: true };
}

async function apiFetch(params: Record<string, any>) {
  try {
    // Pastikan konfigurasi desa sudah diinisialisasi (hanya sekali jika sudah ada)
    if (!localStorage.getItem('sigap_script_url')) {
      await initVillageConfig();
    }
    
    const SCRIPT_URL = localStorage.getItem('sigap_script_url') || DEFAULT_SCRIPT_URL;
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, value]) => {
      cleanParams[key] = String(value);
    });
    
    // Gunakan proxy lokal untuk menghindari CORS
    const urlParams = new URLSearchParams({ ...cleanParams, _t: Date.now().toString() });
    const url = `/api/proxy?url=${encodeURIComponent(SCRIPT_URL)}&${urlParams.toString()}`;
    
    // Gunakan AbortController untuk timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const text = await response.text();
    
    if (!response.ok) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.error === "Google Script Error") {
          throw new Error(`Google Script Error: ${errorData.details}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      } catch (e: any) {
        if (e.message.includes("Google Script Error")) throw e;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      // Jika bukan JSON, mungkin dialihkan ke halaman login Google atau error GAS
      if (text.includes('google-signin') || text.includes('Service Login')) {
        throw new Error('Harap login ke akun Google Anda di browser ini.');
      }
      if (text.includes('指令碼已完成') || text.includes('Script completed')) {
        throw new Error('Script Google tidak mengembalikan data. Cek parameter action.');
      }
      return null;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`API Timeout (${params.action})`);
      throw new Error('Koneksi lambat atau terputus (Timeout).');
    }
    console.error(`API Fetch Error (${params.action}):`, error);
    throw error;
  }
}

export async function loginUser(email: string, pass: string) {
  try {
    const data = await apiFetch({ action: 'login', email, pass });
    return data || { success: false };
  } catch (error) {
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
    const res = await apiFetch({ action: 'saveAttendance', ...data });
    return res && res.success !== false;
  } catch (error) {
    return false;
  }
}

export async function saveReport(data: { date: string; detail: string; output: string; email: string }) {
  try {
    const res = await apiFetch({ action: 'saveReport', ...data });
    return res && res.success !== false;
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
    const res = await apiFetch({ action: 'saveSettings', ...data });
    return res && res.success !== false;
  } catch (error) {
    return false;
  }
}

export async function saveUser(data: { name: string; email: string; pass: string; role: string }) {
  try {
    const res = await apiFetch({ action: 'saveUser', ...data });
    if (res && res.success === true) {
      return { success: true };
    }
    return { 
      success: false, 
      error: res?.error || 'Gagal menyimpan data ke server.' 
    };
  } catch (error) {
    return { success: false, error: 'Koneksi ke script gagal. Pastikan izin "Anyone" sudah aktif.' };
  }
}
