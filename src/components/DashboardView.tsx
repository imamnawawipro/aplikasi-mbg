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
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DashboardView() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any[]>([]);

    // Default range: Last 7 days
    useEffect(() => {
        const end = new Date();
        const start = subDays(end, 6);
        const interval = eachDayOfInterval({ start, end });

        fetchStats(interval);
    }, []);

    async function fetchStats(dateRange: Date[]) {
        try {
            setLoading(true);
            const startDate = format(dateRange[0], 'yyyy-MM-dd');
            const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

            // Fetch logs in range
            const { data: logs, error } = await supabase
                .from('mbg_logs')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
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
                    day: format(date, 'EEEE', { locale: id })
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Kartu Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Porsi Minggu Ini</p>
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
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Grafik Penerimaan Makan (7 Hari Terakhir)
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
