import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2, AlertCircle, UserPlus, Upload, Search, Filter, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { AddStudentDialog } from './AddStudentDialog';
import { ImportStudentDialog } from './ImportStudentDialog';

interface Student {
    id: string;
    name: string;
    class: string;
    gender?: string; // Add gender
}

interface StudentWithLog extends Student {
    is_received: boolean;
    log_id?: string;
}

interface StudentListProps {
    selectedDate: Date;
}

export function StudentList({ selectedDate }: StudentListProps) {
    const [students, setStudents] = useState<StudentWithLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('all');

    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    useEffect(() => {
        fetchData();
    }, [formattedDate]);

    async function fetchData() {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch all students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .order('class', { ascending: true })
                .order('name', { ascending: true });

            if (studentsError) throw studentsError;

            // 2. Fetch logs for selected date
            const { data: logsData, error: logsError } = await supabase
                .from('mbg_logs')
                .select('*')
                .eq('date', formattedDate);

            if (logsError) throw logsError;

            // 3. Merge data
            const mergedData = (studentsData || []).map((student) => {
                const log = logsData?.find((l) => l.student_id === student.id);
                // Default logic: only checking boolean log exists or true
                return {
                    ...student,
                    is_received: log ? log.is_received : false,
                    log_id: log?.id,
                };
            });

            setStudents(mergedData);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Gagal memuat data.');
        } finally {
            setLoading(false);
        }
    }

    const updateStatus = async (student: StudentWithLog, newIsReceived: boolean) => {
        if (student.is_received === newIsReceived) return; // No change needed

        // Optimistic Update
        setStudents((prev) =>
            prev.map((s) =>
                s.id === student.id ? { ...s, is_received: newIsReceived } : s
            )
        );

        try {
            if (!newIsReceived) {
                // Remove log if explicitly set to "Belum"
                const { error } = await supabase
                    .from('mbg_logs')
                    .delete()
                    .eq('student_id', student.id)
                    .eq('date', formattedDate);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('mbg_logs')
                    .upsert(
                        {
                            student_id: student.id,
                            date: formattedDate,
                            is_received: true,
                            status: 'H' // Default status required for valid schema potentially
                        },
                        { onConflict: 'student_id, date' }
                    );
                if (error) throw error;
            }

        } catch (err) {
            console.error('Error updating status:', err);
            // Revert
            setStudents((prev) =>
                prev.map((s) =>
                    s.id === student.id ? { ...s, is_received: student.is_received } : s
                )
            );
            alert('Gagal menyimpan perubahan. Coba lagi.');
        }
    };

    const toggleAll = async (targetIsReceived: boolean) => {
        if (filteredStudents.length === 0) return;

        const confirmMsg = targetIsReceived
            ? `Tandai ${filteredStudents.length} siswa SUDAH MEMBAWA MBG?`
            : `Reset status ${filteredStudents.length} siswa menjadi BELUM MEMBAWA?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        const affectedIds = filteredStudents.map(s => s.id);

        // Optimistic
        setStudents(prev => prev.map(s =>
            affectedIds.includes(s.id) ? { ...s, is_received: targetIsReceived } : s
        ));

        try {
            if (!targetIsReceived) {
                const { error } = await supabase
                    .from('mbg_logs')
                    .delete()
                    .in('student_id', affectedIds)
                    .eq('date', formattedDate);
                if (error) throw error;
            } else {
                const updates = filteredStudents.map(s => ({
                    student_id: s.id,
                    date: formattedDate,
                    is_received: true,
                    status: 'H'
                }));

                const { error } = await supabase
                    .from('mbg_logs')
                    .upsert(updates, { onConflict: 'student_id, date' });

                if (error) throw error;
            }
        } catch (err) {
            console.error('Batch update error:', err);
            alert('Gagal update massal.');
            fetchData();
        } finally {
            setLoading(false);
        }
    };

    // Extract unique classes
    const uniqueClasses = useMemo(() => {
        const classes = students.map(s => s.class);
        return ['all', ...Array.from(new Set(classes)).sort()];
    }, [students]);

    // Filter Logic
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                student.class.toLowerCase().includes(searchQuery.toLowerCase());
            const matchClass = selectedClass === 'all' || student.class === selectedClass;
            return matchSearch && matchClass;
        });
    }, [students, searchQuery, selectedClass]);

    // Statistics
    // Calculate based on FILTERED students to show context, OR total students?
    // Usually "Today's Log" refers to TOTAL, not just filtered view.
    // But let's show stats for the current view if filtered, or total if not.
    // Let's stick to TOTAL log for the day at the top, or maybe filtered.
    // Good UX: Show Global Day Stats, and maybe Filtered Stats.
    // Let's implement Global Day Stats (Visible all the time).

    const dailyStats = useMemo(() => {
        const sudah = students.filter(s => s.is_received).length;
        return {
            sudah,
            belum: students.length - sudah,
            totalStudents: students.length
        };
    }, [students]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-gray-500">Memuat data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
                <AlertCircle className="w-10 h-10 mb-2" />
                <p>{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 mb-6">
                {/* Top Controls: Stats & Add Buttons */}
                <div className="flex flex-col gap-4">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 rounded-2xl p-4 sm:p-5 text-center shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="block text-xs sm:text-sm text-emerald-600 font-bold uppercase tracking-wider">Sudah Membawa MBG</span>
                            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-700 mt-2 block">{dailyStats.sudah}</span>
                        </div>
                        <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-100 rounded-2xl p-4 sm:p-5 text-center shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-rose-400/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="block text-xs sm:text-sm text-rose-600 font-bold uppercase tracking-wider">Belum Membawa</span>
                            <span className="text-3xl sm:text-4xl font-extrabold text-rose-700 mt-2 block">{dailyStats.belum}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-1">
                        <div className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                            Total Siswa: <span className="font-bold text-gray-800">{dailyStats.totalStudents}</span>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                            >
                                <Upload className="w-4 h-4 text-emerald-600" />
                                Import
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm shadow-emerald-500/20 active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                Tambah
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-sm font-medium bg-white/80 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-gray-400"
                        />
                    </div>

                    <div className="relative min-w-[160px] group">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 text-sm font-medium bg-white/80 border border-gray-200 rounded-2xl appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm cursor-pointer text-gray-700"
                        >
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.filter(c => c !== 'all').map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedClass !== 'all' && filteredStudents.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100 mb-5 animate-in fade-in slide-in-from-top-2 gap-3 shadow-sm">
                    <span className="text-sm text-emerald-800 font-semibold tracking-wide">
                        Menampilkan {filteredStudents.length} Siswa (Kelas {selectedClass})
                    </span>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => toggleAll(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-emerald-500 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-sm active:scale-95"
                        >
                            <CheckSquare className="w-4 h-4" />
                            Semua Sudah
                        </button>

                        <button
                            onClick={() => toggleAll(false)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                            title="Semua Belum"
                        >
                            <Square className="w-4 h-4" />
                            Semua Belum
                        </button>
                    </div>
                </div>
            )}

            {/* Hint when All Class is selected */}
            {selectedClass === 'all' && students.length > 0 && (
                <div className="mb-4 px-2">
                    <p className="text-xs text-gray-400 italic text-center">
                        *Pilih Kelas spesifik untuk menggunakan fitur Ceklis Massal.
                    </p>
                </div>
            )}

            {students.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl border-gray-200 bg-gray-50">
                    <p className="text-gray-500 mb-4">Belum ada data siswa.</p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 text-gray-700 font-medium bg-white border border-gray-300 shadow-sm rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Import Excel
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 text-white font-medium bg-primary shadow-sm rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Tambah Manual
                        </button>
                    </div>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    Tidak ada siswa yang cocok dengan pencarian.
                </div>
            ) : (
                <div className="space-y-4 pb-24">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-2.5 bg-white rounded-2xl border-2 transition-colors duration-200 shadow-sm",
                                student.is_received ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100 hover:border-gray-200"
                            )}
                        >
                            <div className="flex items-start gap-4 mb-4 sm:mb-0">
                                <div className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center text-base font-black min-w-[44px] shadow-sm",
                                    student.gender === 'P' ? "bg-gradient-to-br from-pink-100 to-rose-100 text-rose-600 border border-pink-200" : "bg-gradient-to-br from-blue-100 to-sky-100 text-sky-600 border border-blue-200"
                                )}>
                                    {student.gender || 'L'}
                                </div>
                                <div className="pt-0.5 min-w-0">
                                    <h3 className="text-[15px] font-bold text-gray-900 tracking-tight leading-snug mb-1 truncate">{student.name}</h3>
                                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 items-center">
                                        <span className="font-semibold text-gray-600 px-2 py-0.5 bg-gray-100 rounded-md">Kelas {student.class}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="font-medium">{student.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</span>

                                        <span className="text-gray-400 hidden sm:inline">•</span>
                                        <span className={cn(
                                            "font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider",
                                            student.is_received ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                        )}>
                                            {student.is_received ? 'Sudah Membawa' : 'Belum'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 self-stretch sm:self-auto w-full sm:w-auto mt-3 sm:mt-0">
                                <button
                                    onClick={() => updateStatus(student, true)}
                                    className={cn(
                                        "flex-1 sm:flex-none min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2 active:scale-[0.97]",
                                        student.is_received
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                                            : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                                    )}
                                >
                                    <CheckSquare className={cn("w-5 h-5", student.is_received ? "text-white" : "text-emerald-500")} />
                                    <span>Sudah</span>
                                </button>
                                <button
                                    onClick={() => updateStatus(student, false)}
                                    className={cn(
                                        "flex-1 sm:flex-none min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2 active:scale-[0.97]",
                                        !student.is_received
                                            ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25"
                                            : "bg-gray-50 border border-gray-200 text-gray-500"
                                    )}
                                >
                                    <Square className={cn("w-5 h-5", !student.is_received ? "text-white" : "text-gray-400")} />
                                    <span>Belum</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AddStudentDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />

            <ImportStudentDialog
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </>
    );
}
