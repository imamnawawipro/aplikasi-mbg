import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { StudentList } from './components/StudentList';
import { DailyMenuWidget } from './components/DailyMenuWidget';
import { DashboardView } from './components/DashboardView';
import { LoginPage } from './components/LoginPage';
import { LayoutDashboard, Utensils, CalendarDays, LogOut, Loader2, ClipboardCheck, UtensilsCrossed } from 'lucide-react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from './lib/supabase';

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'menu' | 'attendance' | 'report'>('menu');
  const [scrolled, setScrolled] = useState(false);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Scroll effect handler
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Greeting Logic
  const hour = new Date().getHours();
  let greeting = 'Good Morning! ☀️';
  if (hour >= 12 && hour < 18) greeting = 'Good Afternoon! 🌤️';
  else if (hour >= 18) greeting = 'Good Evening! 🌙';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50 text-gray-900 font-sans pb-28 sm:pb-20">

      {/* Modern Gradient Header */}
      <header
        className={cn(
          "sticky top-0 z-20 will-change-transform",
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-sm py-3 border-b border-gray-100/80 transition-all duration-300 ease-out"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 py-8 sm:py-10 shadow-lg rounded-b-[2rem] mb-4 relative overflow-hidden transition-all duration-300 ease-out"
        )}
      >
        {/* Subtle background element when not scrolled */}
        {!scrolled && (
          <div className="absolute inset-0 bg-white/5 opacity-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none"></div>
        )}

        <div className="max-w-md mx-auto px-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="transition-all duration-500">
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                scrolled ? "text-emerald-600" : "text-emerald-100/80"
              )}>
                Si-MBG-E
              </p>
              <h1 className={cn(
                "font-extrabold origin-left mt-0.5 transition-all duration-300 ease-out",
                scrolled ? "text-lg text-gray-800" : "text-2xl sm:text-3xl text-white tracking-tight drop-shadow-sm"
              )}>
                {scrolled ? "Si-MBG-E" : greeting}
              </h1>
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100 mt-1"
              )}>
                <p className="text-emerald-50 text-sm font-medium flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 opacity-80" />
                  {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={cn(
                "p-3 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                scrolled
                  ? "bg-gray-50 text-gray-400 shadow-sm hover:bg-red-50 hover:text-red-500 border border-transparent"
                  : "glass text-white hover:bg-white/20 hover:text-red-100 border-white/20 shadow-glass"
              )}
              title="Logout"
            >
              <div className="relative z-10 flex items-center justify-center">
                {scrolled ? <LogOut className="w-5 h-5 transition-colors" /> : <UtensilsCrossed className="w-6 h-6 group-hover:scale-0 transition-transform duration-300" />}
                {!scrolled && <LogOut className="w-6 h-6 absolute inset-0 scale-0 group-hover:scale-100 transition-transform duration-300" />}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 space-y-6">

        {/* Calendar - Visible for Menu and Attendance */}
        {(activeTab === 'menu' || activeTab === 'attendance') && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-3 text-gray-600 font-medium text-sm">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Pilih Tanggal
            </div>
            <CalendarView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        )}

        {/* Content Switcher */}
        {activeTab === 'menu' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <DailyMenuWidget selectedDate={selectedDate} />
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <StudentList selectedDate={selectedDate} />
          </div>
        )}

        {activeTab === 'report' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <DashboardView />
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar (Modern) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-gray-100/80 pb-safe pt-1 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-16 pb-1">
          {/* Tab 1: Menu Harian */}
          <button
            onClick={() => setActiveTab('menu')}
            className="relative flex flex-col items-center justify-center gap-1 w-20 h-full group"
          >
            <div className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
              activeTab === 'menu' ? "bg-emerald-500 scale-100 opacity-100" : "scale-0 opacity-0"
            )}></div>
            <div className={cn(
              "p-2.5 rounded-2xl transition-all duration-300",
              activeTab === 'menu' ? "bg-emerald-50 text-emerald-600 scale-110" : "bg-transparent text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-50"
            )}>
              <Utensils className={cn("w-6 h-6 transition-all", activeTab === 'menu' && "fill-emerald-600/20")} strokeWidth={activeTab === 'menu' ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] transition-all duration-300",
              activeTab === 'menu' ? "font-bold text-emerald-600" : "font-medium text-gray-400 group-hover:text-gray-600"
            )}>Menu</span>
          </button>

          {/* Tab 2: Kehadiran */}
          <button
            onClick={() => setActiveTab('attendance')}
            className="relative flex flex-col items-center justify-center gap-1 w-20 h-full group"
          >
            <div className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
              activeTab === 'attendance' ? "bg-emerald-500 scale-100 opacity-100" : "scale-0 opacity-0"
            )}></div>
            <div className={cn(
              "p-2.5 rounded-2xl transition-all duration-300",
              activeTab === 'attendance' ? "bg-emerald-50 text-emerald-600 scale-110" : "bg-transparent text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-50"
            )}>
              <ClipboardCheck className={cn("w-6 h-6 transition-all", activeTab === 'attendance' && "fill-emerald-600/20")} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] transition-all duration-300",
              activeTab === 'attendance' ? "font-bold text-emerald-600" : "font-medium text-gray-400 group-hover:text-gray-600"
            )}>Kehadiran</span>
          </button>

          {/* Tab 3: Laporan */}
          <button
            onClick={() => setActiveTab('report')}
            className="relative flex flex-col items-center justify-center gap-1 w-20 h-full group"
          >
            <div className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
              activeTab === 'report' ? "bg-emerald-500 scale-100 opacity-100" : "scale-0 opacity-0"
            )}></div>
            <div className={cn(
              "p-2.5 rounded-2xl transition-all duration-300",
              activeTab === 'report' ? "bg-emerald-50 text-emerald-600 scale-110" : "bg-transparent text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-50"
            )}>
              <LayoutDashboard className={cn("w-6 h-6 transition-all", activeTab === 'report' && "fill-emerald-600/20")} strokeWidth={activeTab === 'report' ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] transition-all duration-300",
              activeTab === 'report' ? "font-bold text-emerald-600" : "font-medium text-gray-400 group-hover:text-gray-600"
            )}>Laporan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
