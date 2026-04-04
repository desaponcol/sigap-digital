const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbW3h1BlJsmnz0i7a9aJWSl3NB39K1DkWvnfdUP0ojr8lOmVzAukJd9qW3VJfaiG7D/exec';

async function apiFetch(params: Record<string, string>) {
  const urlParams = new URLSearchParams({ ...params, _t: Date.now().toString() });
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
          role: "Digital Concierge",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
        }
      };
    }
    return { success: false };
  }
}

export async function fetchAttendanceRecords() {
  try {
    const data = await apiFetch({ action: 'getAttendance' });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function fetchReportRecords() {
  try {
    const data = await apiFetch({ action: 'getReports' });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export async function saveAttendance(data: { status: string; location: string; timestamp: string }) {
  try {
    await apiFetch({ action: 'saveAttendance', ...data });
    return true;
  } catch (error) {
    return false;
  }
}

export async function saveReport(data: { date: string; detail: string; output: string }) {
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
    return data || {
      office_lat: -7.729756740246309,
      office_lng: 111.26261833357766,
      allowed_radius: 50
    };
  } catch (error) {
    return {
      office_lat: -7.729756740246309,
      office_lng: 111.26261833357766,
      allowed_radius: 50
    };
  }
}
