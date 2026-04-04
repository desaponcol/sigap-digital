export type Screen = 'login' | 'dashboard' | 'presensi' | 'laporan' | 'rekap';

export interface User {
  name: string;
  role: string;
  avatar: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT';
  time?: string;
  reason?: string;
}

export interface ReportRecord {
  id: string;
  date: string;
  detail: string;
  output: string;
}
