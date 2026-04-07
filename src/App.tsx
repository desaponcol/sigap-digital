import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Menu, 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  History, 
  ChevronRight, 
  CheckCircle2, 
  CalendarX, 
  Stethoscope,
  LogIn,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  ArrowRight,
  Save,
  Lightbulb,
  FileDown,
  Navigation,
  Loader2,
  Settings,
  Map,
  AlertCircle,
  Check
} from 'lucide-react';
import { cn } from './lib/utils';
import { type Screen, type User, type AttendanceRecord, type ReportRecord, type AppSettings } from './types';
import { fetchAttendanceRecords, fetchReportRecords, saveAttendance, saveReport, loginUser, fetchSettings, saveSettings } from './services/api';

// Helper for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

// Mock Data
const MOCK_USER: User = {
  name: "Ahmad Dani",
  role: "Admin Digital Concierge",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
};

const MOCK_RECORDS: AttendanceRecord[] = [];

const formatDateIndo = (dateVal: any) => {
  if (!dateVal || dateVal === '-') return '-';
  
  try {
    let date: Date | null = null;

    // 1. Jika sudah berupa objek Date
    if (dateVal instanceof Date) {
      date = dateVal;
    } 
    // 2. Jika berupa angka (Serial Number Excel/Google Sheets, misal: 46116)
    else if (typeof dateVal === 'number' || (!isNaN(Number(dateVal)) && !String(dateVal).includes('-') && !String(dateVal).includes('/'))) {
      const num = Number(dateVal);
      if (num > 30000 && num < 60000) {
        // Konversi serial number ke Date
        date = new Date(Math.round((num - 25569) * 86400 * 1000));
      }
    }

    // 3. Jika berupa string
    if (!date && typeof dateVal === 'string') {
      const str = dateVal.trim();
      
      // Cek format YYYY-MM-DD (2026-04-04)
      const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (ymd) {
        date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      } 
      // Cek format DD/MM/YYYY (05/04/2026)
      else {
        const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmy) {
          date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        } else {
          const d = new Date(str);
          if (!isNaN(d.getTime())) date = d;
        }
      }
    }

    if (date && !isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    }
  } catch (e) {
    console.error('Error formatting date:', dateVal, e);
  }
  
  return String(dateVal);
};

const parseDate = (dateVal: any): number => {
  if (!dateVal || dateVal === '-') return 0;
  try {
    let date: Date | null = null;
    if (dateVal instanceof Date) {
      date = dateVal;
    } else if (typeof dateVal === 'number' || (!isNaN(Number(dateVal)) && !String(dateVal).includes('-') && !String(dateVal).includes('/'))) {
      const num = Number(dateVal);
      if (num > 30000 && num < 60000) {
        date = new Date(Math.round((num - 25569) * 86400 * 1000));
      }
    }
    if (!date && typeof dateVal === 'string') {
      const str = dateVal.trim();
      const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (ymd) {
        date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      } else {
        const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmy) {
          date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
        } else {
          const d = new Date(str);
          if (!isNaN(d.getTime())) date = d;
        }
      }
    }
    return date ? date.getTime() : 0;
  } catch (e) {
    return 0;
  }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User>(MOCK_USER);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [reportRecords, setReportRecords] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadRecords();
    }
  }, [isLoggedIn]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const [attData, repData] = await Promise.all([
        fetchAttendanceRecords(),
        fetchReportRecords()
      ]);
      setRecords(attData || []);
      setReportRecords(repData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleLogin = async (email: string, pass: string) => {
    setIsLoading(true);
    const result = await loginUser(email, pass);
    if (result && result.success) {
      setUser(result.user);
      setIsLoggedIn(true);
      navigate('dashboard');
      showNotification('Selamat datang kembali!');
    } else {
      showNotification('Email atau password salah!', 'error');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none grain-texture z-0" />
      
      <AnimatePresence mode="wait">
        {currentScreen === 'login' ? (
          <motion.div key="login" className="w-full">
            <LoginScreen onLogin={handleLogin} isLoading={isLoading} />
          </motion.div>
        ) : (
          <motion.div key="main" className="w-full">
            <MainLayout 
              user={user} 
              currentScreen={currentScreen} 
              onNavigate={navigate}
              isLoading={isLoading}
            >
              <AnimatePresence mode="wait">
                {currentScreen === 'dashboard' && <DashboardScreen user={user} onNavigate={navigate} records={records} />}
                {currentScreen === 'presensi' && (
                  <PresensiScreen 
                    onSave={() => {
                      loadRecords();
                      showNotification('Presensi berhasil dikirim!');
                      navigate('dashboard');
                    }} 
                    onError={(msg) => showNotification(msg, 'error')}
                  />
                )}
                {currentScreen === 'laporan' && (
                  <LaporanScreen 
                    onSave={() => {
                      loadRecords();
                      showNotification('Laporan berhasil disimpan!');
                      navigate('dashboard');
                    }} 
                    onError={(msg) => showNotification(msg, 'error')}
                  />
                )}
                {currentScreen === 'rekap' && (
                  <RekapScreen 
                    records={records} 
                    reportRecords={reportRecords}
                    isLoading={isLoading} 
                    onRefresh={loadRecords} 
                    user={user} 
                  />
                )}
                {currentScreen === 'settings' && (
                  <SettingsScreen 
                    onSave={() => {
                      showNotification('Pengaturan berhasil disimpan!');
                      navigate('dashboard');
                    }}
                    onError={(msg) => showNotification(msg, 'error')}
                  />
                )}
              </AnimatePresence>
            </MainLayout>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs"
          >
            <div className={cn(
              "p-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              notification.type === 'success' 
                ? "bg-emerald-500/90 text-white border-emerald-400/50" 
                : "bg-red-500/90 text-white border-red-400/50"
            )}>
              {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-xs font-black uppercase tracking-widest">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Screens ---

function LoginScreen({ onLogin, isLoading }: { onLogin: (email: string, pass: string) => void, isLoading?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10"
    >
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-primary-container/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-secondary-container/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md space-y-10">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 3 }}
            className="inline-flex items-center justify-center w-24 h-24 mb-2 overflow-hidden"
          >
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1769768658/afiks_gwju4y.png" 
              alt="SIGAP Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter text-dark-accent">SIGAP</h1>
          <p className="text-[11px] uppercase tracking-[0.4em] text-primary font-black">Digital Concierge Desa</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_20px_50px_rgba(28,28,23,0.05)] border border-outline-variant/10"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-1">Welcome back</h2>
            <p className="text-on-surface-variant text-base leading-relaxed">Please enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-secondary ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-secondary">Password</label>
                <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-primary">Lupa Password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base"
                  required
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Masuk
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
            <p className="text-on-surface-variant text-xs">Don't have an account? <span className="text-primary font-bold">Contact Admin</span></p>
          </div>
        </motion.div>

        <footer className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-outline-variant/30" />
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">v1.0.0 Prestige Edition</p>
            <div className="h-px w-8 bg-outline-variant/30" />
          </div>
          <p className="text-[10px] text-on-surface-variant/60 font-medium">© 2024 Arunika Kreatif media. All Rights Reserved.</p>
        </footer>
      </div>
    </motion.main>
  );
}

function MainLayout({ 
  children, 
  user, 
  currentScreen, 
  onNavigate,
  isLoading
}: { 
  children: React.ReactNode; 
  user: User; 
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col min-h-screen pb-28">
      <header className="fixed top-0 w-full z-50 bg-dark-accent/95 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-center px-6 py-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1769768658/afiks_gwju4y.png" 
              alt="SIGAP Logo" 
              className="w-9 h-9 object-contain"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-2xl font-black text-primary tracking-tight">SIGAP</h1>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border-2 border-primary object-cover shadow-sm"
            />
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto w-full flex-grow">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full z-50 px-4 pb-6 pointer-events-none">
        <div className="max-w-md mx-auto bg-dark-accent/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex justify-around items-center p-3 pointer-events-auto">
          <NavItem 
            active={currentScreen === 'dashboard'} 
            icon={<LayoutDashboard />} 
            label="Home" 
            onClick={() => onNavigate('dashboard')} 
          />
          <NavItem 
            active={currentScreen === 'presensi'} 
            icon={<MapPin />} 
            label="Presensi" 
            onClick={() => onNavigate('presensi')} 
          />
          <NavItem 
            active={currentScreen === 'laporan'} 
            icon={<FileText />} 
            label="Laporan" 
            onClick={() => onNavigate('laporan')} 
          />
          <NavItem 
            active={currentScreen === 'rekap'} 
            icon={<History />} 
            label="Rekap" 
            onClick={() => onNavigate('rekap')} 
          />
          {user.role.toLowerCase().includes('admin') && (
            <NavItem 
              active={currentScreen === 'settings'} 
              icon={<Settings />} 
              label="Setting" 
              onClick={() => onNavigate('settings')} 
            />
          )}
        </div>
      </nav>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300 min-w-[56px] min-h-[56px]",
        active 
          ? "bg-primary text-dark-accent rounded-2xl scale-110 -translate-y-2 shadow-lg shadow-primary/20" 
          : "text-white/40 hover:text-primary"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest mt-1",
        active ? "block" : "hidden"
      )}>
        {label}
      </span>
    </button>
  );
}

function DashboardScreen({ user, onNavigate, records }: { user: User, onNavigate: (s: Screen) => void, records: AttendanceRecord[] }) {
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const s = await fetchSettings();
      setSettings(s);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          if (s) {
            const d = getDistance(latitude, longitude, Number(s.office_lat), Number(s.office_lng));
            setDistance(d);
          }
        }, (err) => console.error("Geolocation error:", err), { enableHighAccuracy: true, timeout: 10000 });
      }
    };
    init();
  }, []);

  const isInRadius = settings && distance !== null && distance <= Number(settings.allowed_radius);

  // Calculate real stats from records
  const stats = {
    hadir: records.filter(r => (r.Status || r.status) === 'HADIR').length,
    izin: records.filter(r => (r.Status || r.status) === 'IZIN').length,
    sakit: records.filter(r => (r.Status || r.status) === 'SAKIT').length,
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <section className="space-y-1">
        <p className="text-secondary font-bold tracking-widest uppercase text-[10px]">Digital Concierge</p>
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Halo, {user.name}</h2>
      </section>

      {/* GPS Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-on-surface">Status Lokasi</h3>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
              <Navigation className="w-3.5 h-3.5" />
              {distance === null ? 'Mencari lokasi...' : isInRadius ? 'Sudah berada di dalam area' : 'Di luar area kantor'}
            </p>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1.5 border",
            distance === null ? "bg-surface-container text-outline border-outline-variant" :
            isInRadius 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-red-50 text-red-700 border-red-100"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              distance === null ? "bg-outline" : isInRadius ? "bg-emerald-600" : "bg-red-600"
            )} />
            {distance === null ? 'CHECKING...' : isInRadius ? 'DALAM RADIUS' : 'LUAR RADIUS'}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-bold text-secondary uppercase tracking-widest">
            <span>Posisi Anda</span>
            <span>Pusat Kantor</span>
          </div>
          <div className="relative h-2 w-full bg-surface-container rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: distance === null ? '0%' : isInRadius ? '100%' : '40%' }}
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000",
                isInRadius ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Radius: {settings?.allowed_radius || 100}m
            </span>
            <span className="text-xs font-black text-primary">
              {distance !== null ? `${Math.round(distance)}m dari Titik` : 'Mencari...'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('presensi')}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl shadow-xl active:scale-95 transition-all group"
        >
          <LogIn className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-tight">Mulai Presensi</span>
        </button>
        <button 
          onClick={() => onNavigate('laporan')}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container-lowest text-primary rounded-2xl shadow-sm border border-outline-variant/20 active:scale-95 transition-all group"
        >
          <FileText className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-tight">Buat Laporan</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-8 space-y-6 shadow-sm border border-outline-variant/10">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-on-surface-variant text-sm">Ringkasan Bulan Ini</h3>
          <button onClick={() => onNavigate('rekap')} className="text-[10px] font-bold text-secondary underline tracking-widest uppercase">Lihat Detail</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon={<CheckCircle2 />} value={String(stats.hadir).padStart(2, '0')} label="Hadir" color="primary" />
          <StatBox icon={<CalendarX />} value={String(stats.izin).padStart(2, '0')} label="Izin" color="secondary" />
          <StatBox icon={<Stethoscope />} value={String(stats.sakit).padStart(2, '0')} label="Sakit" color="red" />
        </div>
      </div>

      {/* Recent Activity Map */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold tracking-tight">Aktivitas Terkini</h3>
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  if (settings) {
                    setDistance(getDistance(pos.coords.latitude, pos.coords.longitude, Number(settings.office_lat), Number(settings.office_lng)));
                  }
                }, null, { enableHighAccuracy: true });
              }
            }}
            className="p-2 bg-surface-container-low rounded-full text-primary active:rotate-180 transition-transform duration-500"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
        <div className="rounded-2xl h-48 w-full overflow-hidden relative shadow-sm border border-outline-variant/10 bg-surface-container">
          {coords ? (
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight={0} 
              marginWidth={0} 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng-0.005},${coords.lat-0.005},${coords.lng+0.005},${coords.lat+0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
              className="grayscale contrast-125 opacity-70"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-outline-variant/10">
              <MapPin className="text-primary w-6 h-6 fill-primary/20" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Lokasi Terdeteksi</p>
              <p className="text-sm font-black text-on-surface">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Mencari...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, value, label, color }: { icon: React.ReactNode, value: string, label: string, color: string }) {
  return (
    <div className="bg-surface p-4 rounded-xl flex flex-col items-center gap-2 border border-outline-variant/10">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        color === 'primary' && "bg-primary/10 text-primary",
        color === 'secondary' && "bg-secondary/10 text-secondary",
        color === 'red' && "bg-red-50 text-red-600"
      )}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      <span className="text-2xl font-black text-on-surface">{value}</span>
      <span className="text-[9px] font-bold text-secondary tracking-widest uppercase">{label}</span>
    </div>
  );
}

function PresensiScreen({ onSave, onError }: { onSave: () => void, onError: (msg: string) => void }) {
  const [selected, setSelected] = useState<'HADIR' | 'IZIN' | 'SAKIT'>('HADIR');
  const [location, setLocation] = useState('Mencari lokasi...');
  const [distance, setDistance] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  const refreshLocation = () => {
    setLocation('Mencari lokasi...');
    setDistance(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        if (settings) {
          const d = getDistance(latitude, longitude, Number(settings.office_lat), Number(settings.office_lng));
          setDistance(d);
        }
      }, (error) => {
        setLocation('Gagal mendapatkan lokasi');
        console.error(error);
      }, { enableHighAccuracy: true, timeout: 10000 });
    }
  };

  useEffect(() => {
    const init = async () => {
      const s = await fetchSettings();
      setSettings(s);
      refreshLocation();
    };
    init();
  }, []);

  const isInRadius = settings && distance !== null && distance <= Number(settings.allowed_radius);

  const handleSubmit = async () => {
    if (!isInRadius && selected === 'HADIR') {
      onError('Anda berada di luar radius kantor!');
      return;
    }

    setIsSubmitting(true);
    const success = await saveAttendance({
      status: selected,
      location,
      timestamp: new Date().toISOString()
    });
    
    if (success) {
      onSave();
    } else {
      onError('Gagal mengirim presensi.');
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <section className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Input Presensi</h2>
        <p className="text-secondary font-medium text-base leading-relaxed">Silahkan pilih status kehadiran Anda hari ini.</p>
      </section>

      <div className="space-y-4">
        <StatusOption 
          active={selected === 'HADIR'} 
          onClick={() => setSelected('HADIR')} 
          label="HADIR" 
          icon={<CheckCircle2 />} 
          color="primary"
        />
        <StatusOption 
          active={selected === 'IZIN'} 
          onClick={() => setSelected('IZIN')} 
          label="IZIN" 
          icon={<FileText />} 
          color="secondary"
        />
        <StatusOption 
          active={selected === 'SAKIT'} 
          onClick={() => setSelected('SAKIT')} 
          label="SAKIT" 
          icon={<Stethoscope />} 
          color="red"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-sm border border-outline-variant/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full animate-pulse",
              distance === null ? "bg-outline" : isInRadius ? "bg-primary" : "bg-red-500"
            )} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              distance === null ? "text-outline" : isInRadius ? "text-primary" : "text-red-500"
            )}>
              {distance === null ? 'GPS: MENCARI...' : isInRadius ? 'GPS: DALAM RADIUS' : 'GPS: LUAR RADIUS'}
            </span>
          </div>
          <button 
            onClick={refreshLocation}
            className="p-2 bg-surface-container-low rounded-full text-primary active:rotate-180 transition-transform"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="h-40 bg-surface-container rounded-2xl overflow-hidden relative border border-outline-variant/20">
          {coords ? (
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight={0} 
              marginWidth={0} 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng-0.005},${coords.lat-0.005},${coords.lng+0.005},${coords.lat+0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
              className="grayscale contrast-125 opacity-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl border-2",
              isInRadius ? "border-primary" : "border-red-500"
            )}>
              <MapPin className={cn(
                "w-5 h-5",
                isInRadius ? "text-primary fill-primary/20" : "text-red-500 fill-red-500/20"
              )} />
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="text-primary w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-on-surface">Lokasi Terdeteksi</p>
            <p className="text-[10px] text-on-surface-variant font-medium">{location}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 space-y-4">
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 fill-white" />}
          Kirim Presensi
        </button>
        <p className="text-center text-[10px] text-secondary font-bold uppercase tracking-widest opacity-60">
          Waktu Server: {new Date().toLocaleTimeString('id-ID')} WIB
        </p>
      </div>
    </motion.div>
  );
}

function StatusOption({ active, onClick, label, icon, color }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-6 py-5 rounded-2xl border transition-all active:scale-[0.98] min-h-[72px]",
        active 
          ? "bg-primary text-dark-accent border-primary shadow-lg shadow-primary/20" 
          : "bg-surface-container-lowest border-outline-variant/20 text-secondary"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-xl", active ? "bg-dark-accent/10" : "bg-surface-container-low")}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        <span className="font-black tracking-widest text-lg">{label}</span>
      </div>
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
        active ? "border-dark-accent" : "border-outline-variant/50"
      )}>
        {active && <div className="w-3 h-3 bg-dark-accent rounded-full" />}
      </div>
    </button>
  );
}

function LaporanScreen({ onSave, onError }: { onSave: () => void, onError: (msg: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    detail: '',
    output: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.detail || !formData.output) {
      onError('Harap isi semua bidang laporan.');
      return;
    }
    setIsSubmitting(true);
    const success = await saveReport(formData);
    if (success) {
      onSave();
    } else {
      onError('Gagal menyimpan laporan.');
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <section className="space-y-1">
        <p className="text-secondary font-bold tracking-widest uppercase text-[10px]">Internal Report</p>
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight leading-tight">Laporan Kerja Harian</h2>
        <p className="text-on-surface-variant font-medium text-base leading-relaxed">Input detailed information about your daily operations and results.</p>
      </section>

      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Tanggal Kegiatan</label>
            <div className="relative">
              <CalendarX className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-bold focus:ring-2 focus:ring-primary/20 transition-all text-base"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Detail Kegiatan</label>
            <textarea 
              placeholder="Apa yang Anda kerjakan hari ini?"
              rows={4}
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              className="w-full p-5 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Hasil/Output</label>
            <textarea 
              placeholder="Sebutkan pencapaian atau hasil kerja..."
              rows={4}
              value={formData.output}
              onChange={(e) => setFormData({ ...formData, output: e.target.value })}
              className="w-full p-5 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none"
            />
          </div>

          <div className="pt-4 space-y-4">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Laporan
            </button>
            <p className="text-center text-[10px] text-outline font-bold uppercase tracking-tighter opacity-60">Data will be automatically timestamped and geotagged.</p>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest p-6 rounded-xl space-y-3 shadow-sm border border-outline-variant/10">
          <ShieldCheck className="text-primary w-6 h-6" />
          <div>
            <h4 className="font-black text-on-surface text-sm">Data Secure</h4>
            <p className="text-[10px] text-on-surface-variant font-medium leading-tight">Laporan terenkripsi dan tersimpan di server aman.</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl space-y-3 shadow-sm border border-outline-variant/10">
          <Lightbulb className="text-secondary w-6 h-6" />
          <div>
            <h4 className="font-black text-secondary text-sm">Tips Kerja</h4>
            <p className="text-[10px] text-on-secondary-fixed-variant font-medium leading-tight">Pastikan output bersifat kuantitatif untuk evaluasi.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsScreen({ onSave, onError }: { onSave: () => void, onError: (msg: string) => void }) {
  const [settings, setSettings] = useState<AppSettings>({
    office_lat: -7.729756740246309,
    office_lng: 111.26261833357766,
    allowed_radius: 50,
    nama_desa: '',
    nama_kecamatan: '',
    nama_kepala_desa: '',
    nama_sekretaris_desa: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await fetchSettings();
        if (s) {
          setSettings({
            office_lat: Number(s.office_lat) || -7.729756740246309,
            office_lng: Number(s.office_lng) || 111.26261833357766,
            allowed_radius: Number(s.allowed_radius) || 50,
            nama_desa: s.nama_desa || '',
            nama_kecamatan: s.nama_kecamatan || '',
            nama_kepala_desa: s.nama_kepala_desa || '',
            nama_sekretaris_desa: s.nama_sekretaris_desa || ''
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await saveSettings(settings);
      if (success) {
        onSave();
      } else {
        onError('Gagal menyimpan pengaturan');
      }
    } catch (error) {
      onError('Terjadi kesalahan sistem');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <section className="space-y-1">
        <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Pengaturan Sistem</h2>
        <p className="text-secondary font-medium text-base leading-relaxed">Konfigurasi parameter operasional kantor</p>
      </section>

      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Lokasi Kantor */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Map className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-black text-on-surface uppercase tracking-widest text-xs">Lokasi & Radius</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={settings.office_lat}
                  onChange={(e) => setSettings({ ...settings, office_lat: parseFloat(e.target.value) })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  value={settings.office_lng}
                  onChange={(e) => setSettings({ ...settings, office_lng: parseFloat(e.target.value) })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Radius Aman (Meter)</label>
              <input 
                type="number" 
                value={settings.allowed_radius}
                onChange={(e) => setSettings({ ...settings, allowed_radius: parseInt(e.target.value) })}
                className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div className="h-px bg-outline-variant/10" />

          {/* Administrasi Desa */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-black text-on-surface uppercase tracking-widest text-xs">Administrasi Desa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Nama Desa</label>
                <input 
                  type="text" 
                  value={settings.nama_desa}
                  onChange={(e) => setSettings({ ...settings, nama_desa: e.target.value })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="Contoh: Desa Makmur"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Nama Kecamatan</label>
                <input 
                  type="text" 
                  value={settings.nama_kecamatan}
                  onChange={(e) => setSettings({ ...settings, nama_kecamatan: e.target.value })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="Contoh: Kec. Sukses"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Nama Kepala Desa</label>
                <input 
                  type="text" 
                  value={settings.nama_kepala_desa}
                  onChange={(e) => setSettings({ ...settings, nama_kepala_desa: e.target.value })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="Nama Lengkap & Gelar"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Nama Sekretaris Desa</label>
                <input 
                  type="text" 
                  value={settings.nama_sekretaris_desa}
                  onChange={(e) => setSettings({ ...settings, nama_sekretaris_desa: e.target.value })}
                  className="w-full p-4 bg-surface border border-outline-variant/20 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="Nama Lengkap & Gelar"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

function RekapScreen({ 
  records, 
  reportRecords,
  isLoading, 
  onRefresh, 
  user 
}: { 
  records: AttendanceRecord[], 
  reportRecords: ReportRecord[],
  isLoading?: boolean, 
  onRefresh: () => void, 
  user: User 
}) {
  const [activeTab, setActiveTab] = useState<'RIWAYAT' | 'LAPORAN'>('RIWAYAT');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const settings = await fetchSettings();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const totalWidth = pageWidth - 28; // 14 margin on each side

      // Set default font to helvetica (Arial alternative)
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN AKTIVITAS PEGAWAI', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const startY = 35;
      doc.text(`Nama: ${user.name}`, 14, startY);
      doc.text(`Jabatan: ${user.role}`, 14, startY + 5);
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, 14, startY + 10);
      
      // Sorting records by date (ascending)
      const sortedRecords = [...records].sort((a, b) => 
        parseDate(a.Date || a.date || a.tanggal || a.timestamp) - 
        parseDate(b.Date || b.date || b.tanggal || b.timestamp)
      );
      
      const sortedReports = [...reportRecords].sort((a, b) => 
        parseDate(a.Date || a.date || a.tanggal || a.timestamp) - 
        parseDate(b.Date || b.date || b.tanggal || b.timestamp)
      );

      // Attendance Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Rekap Presensi', 14, startY + 20);
      
      const attColumn = ["No", "Tanggal", "Status", "Lokasi"];
      const attRows = sortedRecords.map((record: any, index) => [
        index + 1,
        formatDateIndo(record.Date || record.date || record.tanggal || record.timestamp || '-'),
        record.Status || record.status || '-',
        record.Location || record.location || record.lokasi || '-'
      ]);

      autoTable(doc, {
        head: [attColumn],
        body: attRows,
        startY: startY + 25,
        theme: 'grid',
        styles: { fontSize: 10, font: 'helvetica' },
        headStyles: { fillColor: [115, 92, 0], fontStyle: 'bold' }, // Primary color
        columnStyles: {
          0: { cellWidth: totalWidth * 0.10 }, // No
          1: { cellWidth: totalWidth * 0.25 }, // Tanggal
          2: { cellWidth: totalWidth * 0.20 }, // Status
          3: { cellWidth: totalWidth * 0.45 }  // Lokasi
        }
      });

      // Report Table
      let finalY = (doc as any).lastAutoTable.finalY || (startY + 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Laporan Kerja', 14, finalY + 15);
      
      const repColumn = ["No", "Tanggal", "Detail Kegiatan", "Output"];
      const repRows = sortedReports.map((record: any, index) => [
        index + 1,
        formatDateIndo(record.Date || record.date || record.tanggal || '-'),
        record.Detail || record.detail || record.kegiatan || '-',
        record.Output || record.output || record.hasil || '-'
      ]);

      autoTable(doc, {
        head: [repColumn],
        body: repRows,
        startY: finalY + 20,
        theme: 'grid',
        styles: { fontSize: 10, font: 'helvetica' },
        headStyles: { fillColor: [128, 85, 51], fontStyle: 'bold' }, // Secondary color
        columnStyles: {
          0: { cellWidth: totalWidth * 0.10 }, // No
          1: { cellWidth: totalWidth * 0.20 }, // Tanggal
          2: { cellWidth: totalWidth * 0.40 }, // Detail
          3: { cellWidth: totalWidth * 0.30 }  // Output
        }
      });

      finalY = (doc as any).lastAutoTable.finalY || (finalY + 20);

      // Signature Block
      const sigY = finalY + 25;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const secretaryName = settings?.nama_sekretaris_desa || '(nama Sekretaris Desa)';
      const headName = settings?.nama_kepala_desa || '(Nama kepala Desa)';
      
      // Row 1: Pembuat & Verifikator
      doc.text('Pembuat Laporan,', pageWidth * 0.25, sigY, { align: 'center' });
      doc.text('Verifikator Laporan,', pageWidth * 0.75, sigY, { align: 'center' });
      
      doc.text(`(${user.name})`, pageWidth * 0.25, sigY + 25, { align: 'center' });
      doc.text(`(${secretaryName})`, pageWidth * 0.75, sigY + 25, { align: 'center' });

      // Row 2: Mengetahui Kepala Desa (Centered)
      doc.text('Mengetahui kepala Desa', pageWidth / 2, sigY + 35, { align: 'center' });
      doc.text(`(${headName})`, pageWidth / 2, sigY + 60, { align: 'center' });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = `printed by sigap Digital Concierge pada ${new Date().toLocaleString('id-ID')}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save(`Laporan_SIGAP_${user.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <section className="space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Rekap Presensi & Laporan</h2>
            <p className="text-secondary font-medium text-base leading-relaxed">Tinjau aktivitas dan performa kerja Anda</p>
          </div>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-surface-container-low rounded-full text-primary active:rotate-180 transition-transform duration-500"
          >
            <Loader2 className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex bg-surface-container-lowest p-1.5 rounded-2xl border border-outline-variant/10 shadow-sm">
          <button 
            onClick={() => setActiveTab('RIWAYAT')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'RIWAYAT' ? "bg-primary text-dark-accent shadow-sm" : "text-secondary/60"
            )}
          >
            Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('LAPORAN')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'LAPORAN' ? "bg-primary text-dark-accent shadow-sm" : "text-secondary/60"
            )}
          >
            Laporan
          </button>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex flex-col justify-center items-center shadow-sm">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary mb-1">Kehadiran</span>
          <span className="text-2xl font-black text-primary">
            {records.length > 0 ? `${Math.round((records.filter(r => r.status === 'HADIR').length / records.length) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary/40">
            {activeTab === 'RIWAYAT' ? 'Aktivitas Terakhir' : 'Laporan Terakhir'}
          </h3>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">
            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="space-y-3">
          {activeTab === 'RIWAYAT' ? (
            <>
              {records.length === 0 && !isLoading && (
                <div className="text-center py-12 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                  <p className="text-sm text-secondary font-medium">Belum ada data presensi.</p>
                </div>
              )}
              {[...records]
                .sort((a, b) => parseDate(b.Date || b.date || b.tanggal || b.timestamp) - parseDate(a.Date || a.date || a.tanggal || a.timestamp))
                .map((record) => (
                <div key={record.id} className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-between border border-outline-variant/10 shadow-sm group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      (record.Status || record.status) === 'HADIR' ? "bg-primary/5 text-primary" : 
                      (record.Status || record.status) === 'IZIN' ? "bg-secondary/5 text-secondary" : "bg-red-50 text-red-600"
                    )}>
                      {(record.Status || record.status) === 'HADIR' ? <MapPin className="fill-current" /> : 
                       (record.Status || record.status) === 'IZIN' ? <FileText /> : <Stethoscope />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-black text-on-surface">
                          {formatDateIndo(record.Date || record.date || record.tanggal || record.timestamp)}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          (record.Status || record.status) === 'HADIR' ? "bg-emerald-100 text-emerald-700" : 
                          (record.Status || record.status) === 'IZIN' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {record.Status || record.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">
                        {record.Location || record.location || record.lokasi || record.Time || record.time || record.reason}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
                </div>
              ))}
            </>
          ) : (
            <>
              {reportRecords.length === 0 && !isLoading && (
                <div className="text-center py-12 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                  <p className="text-sm text-secondary font-medium">Belum ada data laporan.</p>
                </div>
              )}
              {[...reportRecords]
                .sort((a, b) => parseDate(b.Date || b.date || b.tanggal || b.timestamp) - parseDate(a.Date || a.date || a.tanggal || a.timestamp))
                .map((report) => (
                <div key={report.id} className="bg-surface-container-lowest p-5 rounded-xl space-y-3 border border-outline-variant/10 shadow-sm group active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/5 text-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-base font-black text-on-surface">
                        {formatDateIndo(report.Date || report.date || report.tanggal)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-on-surface-variant font-medium line-clamp-2">{report.Detail || report.detail}</p>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black uppercase rounded-full">Output</div>
                      <p className="text-[10px] text-secondary font-bold truncate">{report.Output || report.output}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <button 
        onClick={generatePDF}
        disabled={isGenerating || (records.length === 0 && reportRecords.length === 0)}
        className="fixed bottom-28 right-6 bg-gradient-to-br from-primary to-primary-container text-white p-4 rounded-2xl shadow-2xl hover:scale-105 active:scale-90 transition-all flex items-center gap-2 z-40 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
        <span className="font-black text-xs uppercase tracking-widest">
          {isGenerating ? 'Memproses...' : 'Cetak PDF'}
        </span>
      </button>
    </motion.div>
  );
}
