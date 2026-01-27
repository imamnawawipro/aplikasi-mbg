import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { StudentList } from './components/StudentList';
import { DailyMenuWidget } from './components/DailyMenuWidget';
import { DashboardView } from './components/DashboardView';
import { LoginPage } from './components/LoginPage';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, CalendarDays, LogOut, Loader2, CheckSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-28 sm:pb-20">

      {/* Modern Gradient Header */}
      <header
        className={cn(
          "sticky top-0 z-20 transition-all duration-500 ease-in-out",
          scrolled
            ? "bg-white/90 backdrop-blur-md shadow-sm py-3"
            : "bg-gradient-to-r from-blue-600 to-indigo-700 py-8 shadow-xl rounded-b-[2.5rem] mb-6"
        )}
      >
        <div className="max-w-md mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="transition-all duration-500">
              <p className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors duration-300",
                scrolled ? "text-blue-600" : "text-blue-200"
              )}>
                Si-MBG-E
              </p>
              <h1 className={cn(
                "font-bold transition-all duration-500 origin-left",
                scrolled ? "text-lg text-gray-800 scale-95" : "text-3xl text-white tracking-tight"
              )}>
                {scrolled ? "Si-MBG-E" : greeting}
              </h1>
              <div className={cn(
                "overflow-hidden transition-all duration-500",
                scrolled ? "max-h-0 opacity-0" : "max-h-10 opacity-100 mt-1"
              )}>
                <p className="text-blue-100 text-sm font-medium">
                  {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={cn(
                "p-2.5 rounded-2xl transition-all duration-500 group",
                scrolled
                  ? "bg-blue-50 text-blue-600 shadow-sm hover:bg-red-50 hover:text-red-500"
                  : "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 hover:text-red-200"
              )}
              title="Logout"
            >
              {scrolled ? <LogOut className="w-6 h-6" /> : <UtensilsCrossed className="w-6 h-6 group-hover:hidden" />}
              {!scrolled && <LogOut className="w-6 h-6 hidden group-hover:block" />}
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

      {/* Bottom Navigation Bar (Mobile Style) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t pb-safe pt-2 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-16">
          {/* Tab 1: Menu Harian */}
          <button
            onClick={() => setActiveTab('menu')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300",
              activeTab === 'menu'
                ? "text-blue-600 -translate-y-1"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === 'menu' ? "bg-blue-50" : "bg-transparent"
            )}>
              <UtensilsCrossed className={cn("w-6 h-6", activeTab === 'menu' && "fill-blue-600/20")} />
            </div>
            <span className="text-[10px] font-medium">Menu</span>
          </button>

          {/* Tab 2: Kehadiran */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300",
              activeTab === 'attendance'
                ? "text-blue-600 -translate-y-1"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === 'attendance' ? "bg-blue-50" : "bg-transparent"
            )}>
              <CheckSquare className={cn("w-6 h-6", activeTab === 'attendance' && "fill-blue-600/20")} />
            </div>
            <span className="text-[10px] font-medium">Kehadiran</span>
          </button>

          {/* Tab 3: Laporan */}
          <button
            onClick={() => setActiveTab('report')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300",
              activeTab === 'report'
                ? "text-blue-600 -translate-y-1"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === 'report' ? "bg-blue-50" : "bg-transparent"
            )}>
              <LayoutDashboard className={cn("w-6 h-6", activeTab === 'report' && "fill-blue-600/20")} />
            </div>
            <span className="text-[10px] font-medium">Laporan</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
