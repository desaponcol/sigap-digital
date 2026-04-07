export type Screen = 'login' | 'dashboard' | 'presensi' | 'laporan' | 'rekap' | 'settings';

export interface User {
  name: string;
  role: string;
  avatar: string;
  email: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT';
  time?: string;
  reason?: string;
  tanggal?: string;
  timestamp?: string;
  Date?: string;
  Status?: string;
  Time?: string;
  Timestamp?: string;
  location?: string;
  Location?: string;
  lokasi?: string;
}

export interface ReportRecord {
  id: string;
  date: string;
  detail: string;
  output: string;
  tanggal?: string;
  timestamp?: string;
  Date?: string;
  Detail?: string;
  Output?: string;
  Timestamp?: string;
}

export interface AppSettings {
  office_lat: number;
  office_lng: number;
  allowed_radius: number;
  nama_desa?: string;
  nama_kecamatan?: string;
  nama_kepala_desa?: string;
  nama_sekretaris_desa?: string;
}
