import { useEffect, useState, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { format, subDays, addDays, eachDayOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function DashboardView() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [endDate, setEndDate] = useState(new Date());

    // Calculate start date based on end date (7 days window)
    const startDate = subDays(endDate, 6);
    const dateRangeStr = `${format(startDate, 'd MMM', { locale: id })} - ${format(endDate, 'd MMM yyyy', { locale: id })}`;

    useEffect(() => {
        const interval = eachDayOfInterval({ start: startDate, end: endDate });
        fetchStats(interval);
    }, [endDate]);

    const handlePrevWeek = () => setEndDate(d => subDays(d, 7));
    const handleNextWeek = () => setEndDate(d => addDays(d, 7));
    // const handleToday = () => setEndDate(new Date()); // Removed unused function
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setEndDate(new Date(e.target.value));
        }
    };

    // Presets Logic
    const setPreset = (days: number) => {
        setEndDate(new Date()); // Reset to today as base? Or just end date? 
        // Logic: End date is today, Start date is today - days. But my logic uses endDate - 6.
        // Let's adjust logic. The user wants "Last Week".
        // If I click "Minggu Lalu", EndDate should be Last Sunday?
        // Let's keep it simple: "Last 7 Days" vs "Previous 7 Days window".

        // Preset: Minggu Ini (Today back to -6)
        if (days === 0) setEndDate(new Date());

        // Preset: Minggu Lalu (Today - 7)
        if (days === 7) setEndDate(subDays(new Date(), 7));
    };

    const isCurrentWeek = format(endDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    async function fetchStats(dateRange: Date[]) {
        try {
            setLoading(true);
            const startStr = format(dateRange[0], 'yyyy-MM-dd');
            const endStr = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

            // Fetch logs in range
            const { data: logs, error } = await supabase
                .from('mbg_logs')
                .select('*')
                .gte('date', startStr)
                .lte('date', endStr)
                .eq('is_received', true);

            if (error) throw error;

            // Aggregate functionality
            const aggregated = dateRange.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const count = logs?.filter(l => l.date === dateStr).length || 0;
                return {
                    date: format(date, 'dd MMM', { locale: id }),
                    fullDate: dateStr,
                    count: count,
                    day: format(date, 'EEEE', { locale: id }) // e.g. "Senin"
                };
            });

            setStats(aggregated);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }

    const totalThisWeek = useMemo(() => stats.reduce((acc, curr) => acc + curr.count, 0), [stats]);
    const avgThisWeek = useMemo(() => Math.round(totalThisWeek / (stats.length || 1)), [totalThisWeek, stats]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">

            {/* Date Navigation Control */}
            <div className="bg-white dark:bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
                <button
                    onClick={handlePrevWeek}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center relative group">
                    <p className="text-sm font-medium text-gray-500">Periode Laporan</p>
                    <label className="text-base font-bold text-gray-800 flex items-center gap-2 justify-center cursor-pointer hover:text-blue-600 transition-colors">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {dateRangeStr}
                        <input
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={format(endDate, 'yyyy-MM-dd')}
                            onChange={handleDateChange}
                        />
                    </label>
                    <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        Klik tanggal untuk ubah
                    </span>
                </div>

                <div className="flex gap-2">
                    <div className="hidden sm:flex gap-1 mr-2">
                        <button
                            onClick={() => setPreset(7)}
                            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Minggu Lalu
                        </button>
                        <button
                            onClick={() => setPreset(0)}
                            className={cn(
                                "px-3 py-1 text-xs font-bold rounded-lg transition-colors",
                                isCurrentWeek ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            Minggu Ini
                        </button>
                    </div>

                    <button
                        onClick={handlePrevWeek}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleNextWeek}
                        disabled={isCurrentWeek} // Optional: Disable future if needed, but maybe user wants to see planned menus? Statistics implies past/current.
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            isCurrentWeek ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 text-gray-600"
                        )}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Kartu Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Porsi Periode Ini</p>
                            <h3 className="text-3xl font-bold">{totalThisWeek}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Rata-rata Harian</p>
                            <h3 className="text-3xl font-bold text-gray-800">{avgThisWeek} <span className="text-sm font-normal text-gray-400">siswa</span></h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grafik Mingguan */}
            <div className="bg-white dark:bg-card border rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    Grafik Penerimaan Makan
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {stats.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Coming Soon: Laporan Detail */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                <p className="text-blue-800 font-medium">Laporan bulanan detail akan segera hadir!</p>
                <p className="text-sm text-blue-600 mt-1">Anda dapat melihat rekapitulasi per siswa di versi berikutnya.</p>
            </div>

        </div>
    );
}
