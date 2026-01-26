import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2, Check, AlertCircle, UserPlus, Upload, Search, Filter, CheckSquare, Square } from 'lucide-react';
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

    const toggleStatus = async (student: StudentWithLog) => {
        const newStatus = !student.is_received;

        // Optimistic Update
        setStudents((prev) =>
            prev.map((s) =>
                s.id === student.id ? { ...s, is_received: newStatus } : s
            )
        );

        try {
            const { error } = await supabase
                .from('mbg_logs')
                .upsert(
                    {
                        student_id: student.id,
                        date: formattedDate,
                        is_received: newStatus,
                    },
                    { onConflict: 'student_id, date' }
                );

            if (error) throw error;

        } catch (err) {
            console.error('Error updating status:', err);
            // Revert optimistic update on error
            setStudents((prev) =>
                prev.map((s) =>
                    s.id === student.id ? { ...s, is_received: !newStatus } : s
                )
            );
            alert('Gagal menyimpan perubahan. Coba lagi.');
        }
    };

    const toggleAll = async (targetStatus: boolean) => {
        if (filteredStudents.length === 0) return;

        const confirmMsg = targetStatus
            ? `Tandai ${filteredStudents.length} siswa sebagai SUDAH terima?`
            : `Tandai ${filteredStudents.length} siswa sebagai BELUM terima?`;

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        // Optimistic Update
        const affectedIds = filteredStudents.map(s => s.id);
        setStudents(prev => prev.map(s =>
            affectedIds.includes(s.id) ? { ...s, is_received: targetStatus } : s
        ));

        try {
            const updates = filteredStudents.map(s => ({
                student_id: s.id,
                date: formattedDate,
                is_received: targetStatus
            }));

            const { error } = await supabase
                .from('mbg_logs')
                .upsert(updates, { onConflict: 'student_id, date' });

            if (error) throw error;

        } catch (err) {
            console.error('Batch update error:', err);
            alert('Gagal update massal.');
            fetchData(); // Revert by fetching fresh data
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
        const received = students.filter(s => s.is_received);
        return {
            total: received.length,
            L: received.filter(s => s.gender === 'L' || !s.gender).length,
            P: received.filter(s => s.gender === 'P').length,
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
                <div className="flex flex-col gap-3">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                            <span className="block text-xs text-green-600 font-medium">Total Makan</span>
                            <span className="text-xl font-bold text-green-700">{dailyStats.total}</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                            <span className="block text-xs text-blue-600 font-medium">Laki-laki (L)</span>
                            <span className="text-xl font-bold text-blue-700">{dailyStats.L}</span>
                        </div>
                        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 text-center">
                            <span className="block text-xs text-pink-600 font-medium">Perempuan (P)</span>
                            <span className="text-xl font-bold text-pink-700">{dailyStats.P}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-2">
                        <div className="text-sm text-gray-500">
                            Total Siswa: {dailyStats.totalStudents}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Upload className="w-4 h-4" />
                                Import
                            </button>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Tambah
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        >
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.filter(c => c !== 'all').map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar - Only visible when specific class is selected */}
            {selectedClass !== 'all' && filteredStudents.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs text-blue-600 font-medium">
                        Menampilkan {filteredStudents.length} Siswa (Kelas {selectedClass})
                    </span>

                    <div className="flex gap-2">
                        {/* Check All Button */}
                        <button
                            onClick={() => toggleAll(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                        >
                            <CheckSquare className="w-4 h-4" />
                            Ceklis Semua
                        </button>

                        {/* Uncheck All (Optional, good UX to have) */}
                        <button
                            onClick={() => toggleAll(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                            title="Reset Checklist"
                        >
                            <Square className="w-4 h-4" />
                            Reset
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
                <div className="space-y-3 pb-20">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            onClick={() => toggleStatus(student)}
                            className={cn(
                                "group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200",
                                student.is_received
                                    ? "bg-green-50 border-green-200 shadow-sm"
                                    : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold min-w-[40px]",
                                    student.gender === 'P' ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    {student.gender || 'L'}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "font-semibold text-lg transition-colors",
                                        student.is_received ? "text-green-800" : "text-gray-900 group-hover:text-blue-700"
                                    )}>
                                        {student.name}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Kelas: {student.class}
                                    </span>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                                    student.is_received
                                        ? "bg-green-500 border-green-500 scale-110"
                                        : "bg-transparent border-gray-300 group-hover:border-blue-400"
                                )}
                            >
                                {student.is_received && (
                                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                )}
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
