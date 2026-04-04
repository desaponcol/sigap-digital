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
  Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { type Screen, type User, type AttendanceRecord, type ReportRecord } from './types';
import { fetchAttendanceRecords, fetchReportRecords, saveAttendance, saveReport, loginUser, fetchSettings } from './services/api';

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
  role: "Digital Concierge",
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
};

const MOCK_RECORDS: AttendanceRecord[] = [];

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
              {currentScreen === 'dashboard' && <DashboardScreen user={user} onNavigate={navigate} />}
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
            className="fixed bottom-24 left-6 right-6 z-[100] flex justify-center pointer-events-none"
          >
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border",
              notification.type === 'success' 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-red-500 text-white border-red-400"
            )}>
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <CalendarX className="w-5 h-5" />}
              <span className="font-black text-xs uppercase tracking-widest">{notification.message}</span>
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white shadow-2xl mb-2 overflow-hidden p-3"
          >
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1769768658/afiks_gwju4y.png" 
              alt="SIGAP Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">SIGAP</h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-secondary font-bold">Digital Attendance & Performance Reporting</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(28,28,23,0.05)] border border-outline-variant/10"
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
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base"
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
                  className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base"
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
    <div className="flex flex-col min-h-screen pb-24">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1769768658/afiks_gwju4y.png" 
              alt="SIGAP Logo" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-xl font-black text-primary tracking-tight">SIGAP</h1>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border-2 border-primary-container object-cover shadow-sm"
            />
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto w-full flex-grow">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full z-50 px-4 pb-8 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl rounded-full border border-outline-variant/20 shadow-[0_8px_32px_rgba(28,28,23,0.08)] flex justify-around items-center p-2 pointer-events-auto">
          <NavItem 
            active={currentScreen === 'dashboard'} 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
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
        "flex flex-col items-center justify-center transition-all duration-300",
        active 
          ? "bg-primary-container text-white rounded-full p-3 scale-110 -translate-y-4 shadow-lg shadow-primary-container/30" 
          : "text-secondary p-2 hover:text-primary"
      )}
    >
      {icon}
      <span className={cn(
        "text-[8px] font-bold uppercase tracking-widest mt-1",
        active ? "block" : "hidden"
      )}>
        {label}
      </span>
    </button>
  );
}

function DashboardScreen({ user, onNavigate }: { user: User, onNavigate: (s: Screen) => void }) {
  const [distance, setDistance] = useState<number | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const s = await fetchSettings();
      setSettings(s);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          if (s) {
            const d = getDistance(pos.coords.latitude, pos.coords.longitude, Number(s.office_lat), Number(s.office_lng));
            setDistance(d);
          }
        });
      }
    };
    init();
  }, []);

  const isInRadius = settings && distance !== null && distance <= Number(settings.allowed_radius);

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
      <div className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm border border-outline-variant/10 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-on-surface">Status Lokasi</h3>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
              <Navigation className="w-3.5 h-3.5" />
              {isInRadius ? 'Sudah berada di dalam area' : 'Di luar area kantor'}
            </p>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black tracking-wider flex items-center gap-1.5 border",
            isInRadius 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-red-50 text-red-700 border-red-100"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              isInRadius ? "bg-emerald-600" : "bg-red-600"
            )} />
            {isInRadius ? 'DALAM RADIUS' : 'LUAR RADIUS'}
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
              animate={{ width: isInRadius ? '100%' : '40%' }}
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
          className="flex flex-col items-center justify-center gap-3 p-8 bg-gradient-to-br from-primary to-primary-container text-white rounded-[2.5rem] shadow-xl active:scale-95 transition-all group"
        >
          <LogIn className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-tight">Mulai Presensi</span>
        </button>
        <button 
          onClick={() => onNavigate('laporan')}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-container-lowest text-primary rounded-[2.5rem] shadow-sm border border-outline-variant/20 active:scale-95 transition-all group"
        >
          <FileText className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-tight">Buat Laporan</span>
        </button>
      </div>

      {/* Summary Bento */}
      <div className="bg-surface-container-low rounded-[2.5rem] p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-on-surface-variant text-sm">Ringkasan Bulan Ini</h3>
          <button onClick={() => onNavigate('rekap')} className="text-[10px] font-bold text-secondary underline tracking-widest uppercase">Lihat Detail</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon={<CheckCircle2 />} value="22" label="Hadir" color="primary" />
          <StatBox icon={<CalendarX />} value="02" label="Izin" color="secondary" />
          <StatBox icon={<Stethoscope />} value="01" label="Sakit" color="red" />
        </div>
      </div>

      {/* Recent Activity Map */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold tracking-tight">Aktivitas Terkini</h3>
          <Menu className="w-5 h-5 text-secondary" />
        </div>
        <div className="rounded-[2.5rem] h-48 w-full overflow-hidden relative shadow-sm border border-outline-variant/10">
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop" 
            alt="Map" 
            className="w-full h-full object-cover grayscale opacity-40 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />
          <div className="absolute bottom-6 left-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-outline-variant/10">
              <MapPin className="text-primary w-6 h-6 fill-primary/20" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Lokasi Terdaftar</p>
              <p className="text-sm font-black text-on-surface">Kantor Pusat</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, value, label, color }: { icon: React.ReactNode, value: string, label: string, color: string }) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-3xl flex flex-col items-center gap-2 shadow-sm border border-outline-variant/5">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        color === 'primary' && "bg-primary/10 text-primary",
        color === 'secondary' && "bg-secondary/10 text-secondary",
        color === 'red' && "bg-red-50 text-red-600"
      )}>
        {icon}
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

  useEffect(() => {
    const init = async () => {
      const s = await fetchSettings();
      setSettings(s);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          
          if (s) {
            const d = getDistance(latitude, longitude, Number(s.office_lat), Number(s.office_lng));
            setDistance(d);
          }
        }, (error) => {
          setLocation('Gagal mendapatkan lokasi');
          console.error(error);
        });
      }
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

      <div className="bg-surface-container-low rounded-[2rem] p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full animate-pulse",
              isInRadius ? "bg-primary" : "bg-red-500"
            )} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              isInRadius ? "text-primary" : "text-red-500"
            )}>
              {isInRadius ? 'GPS Aktif: Dalam Radius' : 'GPS Aktif: Luar Radius'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase">
            {distance !== null ? `${Math.round(distance)}m dari Titik` : 'Mencari...'}
          </span>
        </div>
        <div className="h-40 bg-surface-container rounded-2xl overflow-hidden relative border border-outline-variant/20">
          <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover grayscale opacity-50" alt="Map" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-2",
              isInRadius ? "border-primary" : "border-red-500"
            )}>
              <MapPin className={cn(
                "w-6 h-6",
                isInRadius ? "text-primary fill-primary/20" : "text-red-500 fill-red-500/20"
              )} />
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="text-primary-container w-5 h-5 mt-0.5" />
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
        "w-full flex items-center justify-between px-6 py-5 rounded-2xl border transition-all active:scale-[0.98]",
        active 
          ? "bg-primary-container text-white border-primary shadow-lg shadow-primary-container/20" 
          : "bg-surface-container-lowest border-outline-variant/20 text-secondary"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-xl", active ? "bg-white/20" : "bg-surface-container-low")}>
          {icon}
        </div>
        <span className="font-black tracking-widest text-lg">{label}</span>
      </div>
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
        active ? "border-white" : "border-outline-variant/50"
      )}>
        {active && <div className="w-3 h-3 bg-white rounded-full" />}
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

      <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Tanggal Kegiatan</label>
            <div className="relative">
              <CalendarX className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl text-on-surface font-bold focus:ring-2 focus:ring-primary/20 transition-all text-base"
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
              className="w-full p-5 bg-surface-container-low border-none rounded-[2rem] text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-secondary ml-1">Hasil/Output</label>
            <textarea 
              placeholder="Sebutkan pencapaian atau hasil kerja..."
              rows={4}
              value={formData.output}
              onChange={(e) => setFormData({ ...formData, output: e.target.value })}
              className="w-full p-5 bg-surface-container-low border-none rounded-[2rem] text-on-surface font-medium placeholder:text-outline/40 focus:ring-2 focus:ring-primary/20 transition-all text-base resize-none"
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
        <div className="bg-surface-container-low p-6 rounded-[2rem] space-y-3">
          <ShieldCheck className="text-primary w-6 h-6" />
          <div>
            <h4 className="font-black text-on-surface text-sm">Data Secure</h4>
            <p className="text-[10px] text-on-surface-variant font-medium leading-tight">Laporan terenkripsi dan tersimpan di server aman.</p>
          </div>
        </div>
        <div className="bg-secondary-container/20 p-6 rounded-[2rem] space-y-3 border border-secondary-container/10">
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

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('LAPORAN AKTIVITAS PEGAWAI', 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Nama: ${user.name}`, 14, 25);
    doc.text(`Jabatan: ${user.role}`, 14, 32);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 39);
    
    // Attendance Table
    doc.setFontSize(14);
    doc.text('1. Rekap Presensi', 14, 48);
    const attColumn = ["No", "Tanggal", "Status", "Keterangan/Waktu"];
    const attRows = records.map((record: any, index) => [
      index + 1,
      record.date || record.timestamp || record.tanggal || '-',
      record.status || record.Status || '-',
      record.time || record.waktu || record.reason || '-'
    ]);

    autoTable(doc, {
      head: [attColumn],
      body: attRows,
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [115, 92, 0] }, // Primary color
    });

    // Report Table
    let finalY = 52;
    if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
      finalY = (doc as any).lastAutoTable.finalY;
    } else if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.cursor) {
      finalY = (doc as any).lastAutoTable.cursor.y;
    }
    
    doc.setFontSize(14);
    doc.text('2. Laporan Kerja', 14, finalY + 15);
    
    const repColumn = ["No", "Tanggal", "Detail Kegiatan", "Output"];
    const repRows = reportRecords.map((record: any, index) => [
      index + 1,
      record.date || record.tanggal || '-',
      record.detail || record.kegiatan || '-',
      record.output || record.hasil || '-'
    ]);

    autoTable(doc, {
      head: [repColumn],
      body: repRows,
      startY: finalY + 19,
      theme: 'grid',
      headStyles: { fillColor: [128, 85, 51] }, // Secondary color
    });

    doc.save(`Laporan_SIGAP_${user.name.replace(/\s+/g, '_')}.pdf`);
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
        <div className="col-span-2 flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10">
          <button 
            onClick={() => setActiveTab('RIWAYAT')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'RIWAYAT' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-secondary/60"
            )}
          >
            Riwayat
          </button>
          <button 
            onClick={() => setActiveTab('LAPORAN')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'LAPORAN' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-secondary/60"
            )}
          >
            Laporan
          </button>
        </div>
        <div className="bg-primary-container/10 p-4 rounded-2xl border border-primary-container/20 flex flex-col justify-center items-center">
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
                <div className="text-center py-12 bg-surface-container-low rounded-[2rem] border border-dashed border-outline-variant">
                  <p className="text-sm text-secondary font-medium">Belum ada data presensi.</p>
                </div>
              )}
              {records.map((record) => (
                <div key={record.id} className="bg-surface-container-lowest p-5 rounded-[2rem] flex items-center justify-between border border-outline-variant/10 shadow-sm group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      record.status === 'HADIR' ? "bg-primary/5 text-primary" : 
                      record.status === 'IZIN' ? "bg-secondary/5 text-secondary" : "bg-red-50 text-red-600"
                    )}>
                      {record.status === 'HADIR' ? <MapPin className="fill-current" /> : 
                       record.status === 'IZIN' ? <FileText /> : <Stethoscope />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-black text-on-surface">{record.date}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          record.status === 'HADIR' ? "bg-emerald-100 text-emerald-700" : 
                          record.status === 'IZIN' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>
                          {record.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">
                        {record.time || record.reason}
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
                <div className="text-center py-12 bg-surface-container-low rounded-[2rem] border border-dashed border-outline-variant">
                  <p className="text-sm text-secondary font-medium">Belum ada data laporan.</p>
                </div>
              )}
              {reportRecords.map((report) => (
                <div key={report.id} className="bg-surface-container-lowest p-5 rounded-[2rem] space-y-3 border border-outline-variant/10 shadow-sm group active:scale-[0.98] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/5 text-secondary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-base font-black text-on-surface">{report.date}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-on-surface-variant font-medium line-clamp-2">{report.detail}</p>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-black uppercase rounded-full">Output</div>
                      <p className="text-[10px] text-secondary font-bold truncate">{report.output}</p>
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
        disabled={records.length === 0 && reportRecords.length === 0}
        className="fixed bottom-28 right-6 bg-gradient-to-br from-primary to-primary-container text-white p-4 rounded-2xl shadow-2xl hover:scale-105 active:scale-90 transition-all flex items-center gap-2 z-40 disabled:opacity-50"
      >
        <FileDown className="w-5 h-5" />
        <span className="font-black text-xs uppercase tracking-widest">Cetak PDF</span>
      </button>
    </motion.div>
  );
}
