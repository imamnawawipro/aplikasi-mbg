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
import { Loader2, TrendingUp, Users, Calendar, ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export function DashboardView() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [endDate, setEndDate] = useState(new Date());
    const [exporting, setExporting] = useState(false);

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

    // === Excel Export Logic ===
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const interval = eachDayOfInterval({ start: startDate, end: endDate });
            const startStr = format(interval[0], 'yyyy-MM-dd');
            const endStr = format(interval[interval.length - 1], 'yyyy-MM-dd');

            // 1. Fetch all students
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('class', { ascending: true })
                .order('name', { ascending: true });

            if (studentsError) throw studentsError;

            // 2. Fetch all logs in the date range
            const { data: logs, error: logsError } = await supabase
                .from('mbg_logs')
                .select('*')
                .gte('date', startStr)
                .lte('date', endStr);

            if (logsError) throw logsError;

            // 3. Build header row
            const dateHeaders = interval.map(d => format(d, 'dd/MM (EEE)', { locale: id }));
            const headerRow = ['No', 'Nama Siswa', 'Kelas', 'L/P', ...dateHeaders, 'Total Sudah', 'Total Belum'];

            // 4. Build data rows
            const dataRows = (students || []).map((student, idx) => {
                let totalSudah = 0;
                const dailyCells = interval.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const log = (logs || []).find(l => l.student_id === student.id && l.date === dateStr && l.is_received);
                    if (log) {
                        totalSudah++;
                        return '✓';
                    }
                    return '✗';
                });
                const totalBelum = interval.length - totalSudah;
                return [
                    idx + 1,
                    student.name,
                    student.class,
                    student.gender === 'P' ? 'Perempuan' : 'Laki-laki',
                    ...dailyCells,
                    totalSudah,
                    totalBelum
                ];
            });

            // 5. Summary row
            const summaryRow = ['', 'TOTAL PER HARI', '', '', ...interval.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return (logs || []).filter(l => l.date === dateStr && l.is_received).length;
            }), totalThisWeek, ''];

            // 6. Build worksheet
            const ws = XLSX.utils.aoa_to_sheet([
                [`REKAPITULASI PENERIMAAN MBG`],
                [`Periode: ${format(startDate, 'd MMMM yyyy', { locale: id })} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`],
                [],
                headerRow,
                ...dataRows,
                [],
                summaryRow
            ]);

            // Set column widths
            ws['!cols'] = [
                { wch: 4 },     // No
                { wch: 28 },    // Nama
                { wch: 10 },    // Kelas
                { wch: 12 },    // L/P
                ...dateHeaders.map(() => ({ wch: 14 })),
                { wch: 12 },    // Total Sudah
                { wch: 12 },    // Total Belum
            ];

            // Merge title cells
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } },
            ];

            // 7. Create workbook & download
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rekap MBG');

            const fileName = `Rekap_MBG_${format(startDate, 'dd-MM-yyyy')}_sd_${format(endDate, 'dd-MM-yyyy')}.xlsx`;
            XLSX.writeFile(wb, fileName);

        } catch (err) {
            console.error('Export error:', err);
            alert('Gagal mengunduh data. Coba lagi.');
        } finally {
            setExporting(false);
        }
    };

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
            <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-md">
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                    <button
                        onClick={handlePrevWeek}
                        className="p-2 sm:hidden hover:bg-emerald-50 rounded-xl text-gray-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="text-center sm:text-left relative group px-4 sm:px-0">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Periode Laporan</p>
                        <label className="text-base font-bold text-gray-800 flex items-center gap-2 justify-center sm:justify-start cursor-pointer hover:text-emerald-600 transition-colors">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            {dateRangeStr}
                            <input
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                value={format(endDate, 'yyyy-MM-dd')}
                                onChange={handleDateChange}
                            />
                        </label>
                        <span className="text-[10px] text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 whitespace-nowrap">
                            Klik untuk ubah tanggal
                        </span>
                    </div>

                    <div className="flex sm:hidden gap-1">
                        <button
                            onClick={handleNextWeek}
                            disabled={isCurrentWeek}
                            className={cn(
                                "p-2 rounded-xl transition-colors",
                                isCurrentWeek ? "text-gray-300 cursor-not-allowed" : "hover:bg-emerald-50 text-gray-500"
                            )}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto">
                        <button
                            onClick={() => setPreset(7)}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                !isCurrentWeek ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Minggu Lalu
                        </button>
                        <button
                            onClick={() => setPreset(0)}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                isCurrentWeek ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Minggu Ini
                        </button>
                    </div>

                    <div className="hidden sm:flex gap-1 ml-2">
                        <button
                            onClick={handlePrevWeek}
                            className="p-2 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-gray-500 transition-colors shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNextWeek}
                            disabled={isCurrentWeek}
                            className={cn(
                                "p-2 rounded-xl transition-colors shadow-sm",
                                isCurrentWeek ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500"
                            )}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Kartu Ringkasan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full mix-blend-overlay group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full mix-blend-overlay"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-sm group-hover:rotate-6 transition-transform">
                            <TrendingUp className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-emerald-50 text-sm font-semibold tracking-wide">Total Porsi Periode Ini</p>
                            <h3 className="text-3xl font-black mt-1 drop-shadow-sm">{totalThisWeek}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-teal-100 to-emerald-100 text-emerald-600 rounded-xl border border-emerald-200/50">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-semibold tracking-wide">Rata-rata Harian</p>
                            <h3 className="text-3xl font-black text-gray-800 mt-1">{avgThisWeek} <span className="text-sm font-semibold text-gray-400">siswa/hari</span></h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grafik Mingguan */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2.5">
                            Grafik Penerimaan Makan
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">Distribusi porsi harian</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-semibold text-gray-600">Terdistribusi</span>
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeWidth={1.5} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                dx={-10}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                                    padding: '12px 16px'
                                }}
                                itemStyle={{ color: '#047857', fontWeight: 800, fontSize: '18px' }}
                                labelStyle={{ color: '#64748b', fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}
                                formatter={(value: any) => [`${value} Porsi`, '']}
                                separator=""
                            />
                            <Bar
                                dataKey="count"
                                radius={[8, 8, 8, 8]}
                                animationDuration={1500}
                                animationEasing="ease-out"
                            >
                                {stats.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill="url(#colorGradientDashboard)" className="transition-all hover:opacity-80" />
                                ))}
                            </Bar>
                            <defs>
                                <linearGradient id="colorGradientDashboard" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Export to Excel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                            Rekapitulasi Data
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">Export data penerimaan MBG ke file Excel</p>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-4">
                    <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                        <span className="font-semibold">Periode:</span>
                        <span className="font-bold text-emerald-700">{dateRangeStr}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">File Excel akan berisi daftar semua siswa beserta status penerimaan MBG per hari pada periode yang dipilih.</p>
                </div>

                <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]",
                        exporting
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600"
                    )}
                >
                    {exporting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Mengunduh Data...</>
                    ) : (
                        <><Download className="w-5 h-5" /> Download Rekap Excel (.xlsx)</>
                    )}
                </button>
            </div>

        </div>
    );
}
