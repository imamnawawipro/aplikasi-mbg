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
    status: 'H' | 'S' | 'I' | 'A' | null;
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
                // Default logic: if log exists, use its status. If not, null (belum absen).
                return {
                    ...student,
                    is_received: log ? log.is_received : false,
                    status: log ? (log.status as any) || (log.is_received ? 'H' : null) : null,
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

    const updateStatus = async (student: StudentWithLog, newStatus: 'H' | 'S' | 'I' | 'A' | null) => {
        // If clicking the same status, toggle it off (reset to null)
        const effectiveStatus = student.status === newStatus ? null : newStatus;
        const isReceived = effectiveStatus === 'H';

        // Optimistic Update
        setStudents((prev) =>
            prev.map((s) =>
                s.id === student.id ? { ...s, status: effectiveStatus, is_received: isReceived } : s
            )
        );

        try {
            if (effectiveStatus === null) {
                // If unchecking, maybe delete the log or set to null?
                // Let's delete the log to be clean, OR set status to null.
                // Depending on requirement. Let's delete for "Reset".
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
                            is_received: isReceived,
                            status: effectiveStatus
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
                    s.id === student.id ? { ...s, status: student.status, is_received: student.is_received } : s
                )
            );
            alert('Gagal menyimpan perubahan. Coba lagi.');
        }
    };

    const toggleAll = async (targetStatus: 'H') => {
        if (filteredStudents.length === 0) return;

        const confirmMsg = `Tandai ${filteredStudents.length} siswa sebagai HADIR (H)?`;
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        const affectedIds = filteredStudents.map(s => s.id);

        // Optimistic
        setStudents(prev => prev.map(s =>
            affectedIds.includes(s.id) ? { ...s, status: targetStatus, is_received: true } : s
        ));

        try {
            const updates = filteredStudents.map(s => ({
                student_id: s.id,
                date: formattedDate,
                is_received: true,
                status: targetStatus
            }));

            const { error } = await supabase
                .from('mbg_logs')
                .upsert(updates, { onConflict: 'student_id, date' });

            if (error) throw error;

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
        const hadirs = students.filter(s => s.status === 'H');
        return {
            total: hadirs.length, // Total Hadir/Makan
            H: hadirs.length,
            S: students.filter(s => s.status === 'S').length,
            I: students.filter(s => s.status === 'I').length,
            A: students.filter(s => s.status === 'A').length,
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
                    <div className="grid grid-cols-4 gap-2 sm:gap-4">
                        <div className="bg-green-50 border border-green-100 rounded-lg p-2 sm:p-3 text-center">
                            <span className="block text-[10px] sm:text-xs text-green-600 font-medium uppercase">Hadir</span>
                            <span className="text-lg sm:text-xl font-bold text-green-700">{dailyStats.H}</span>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 sm:p-3 text-center">
                            <span className="block text-[10px] sm:text-xs text-yellow-600 font-medium uppercase">Sakit</span>
                            <span className="text-lg sm:text-xl font-bold text-yellow-700">{dailyStats.S}</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 sm:p-3 text-center">
                            <span className="block text-[10px] sm:text-xs text-blue-600 font-medium uppercase">Izin</span>
                            <span className="text-lg sm:text-xl font-bold text-blue-700">{dailyStats.I}</span>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2 sm:p-3 text-center">
                            <span className="block text-[10px] sm:text-xs text-red-600 font-medium uppercase">Alfa</span>
                            <span className="text-lg sm:text-xl font-bold text-red-700">{dailyStats.A}</span>
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
                            onClick={() => toggleAll('H')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors shadow-sm"
                        >
                            <CheckSquare className="w-4 h-4" />
                            Semua Hadir
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
                            className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-3 bg-white rounded-xl border transition-all shadow-sm",
                                student.status === 'H' ? "border-green-300 bg-green-50/30" :
                                    student.status === 'S' ? "border-yellow-300 bg-yellow-50/30" :
                                        student.status === 'I' ? "border-blue-300 bg-blue-50/30" :
                                            student.status === 'A' ? "border-red-300 bg-red-50/30" :
                                                "border-transparent hover:border-gray-200"
                            )}
                        >
                            <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold min-w-[40px]",
                                    student.gender === 'P' ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    {student.gender || 'L'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                                    <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                                        <span>{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                                        {student.status && (
                                            <span className="font-medium px-1.5 py-0.5 rounded bg-gray-100">
                                                Status: {
                                                    student.status === 'H' ? 'Hadir' :
                                                        student.status === 'S' ? 'Sakit' :
                                                            student.status === 'I' ? 'Izin' : 'Alfa'
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-1 sm:gap-2 self-end sm:self-auto">
                                {[
                                    { id: 'H', label: 'H', color: 'green', fullLabel: 'Hadir' },
                                    { id: 'S', label: 'S', color: 'yellow', fullLabel: 'Sakit' },
                                    { id: 'I', label: 'I', color: 'blue', fullLabel: 'Izin' },
                                    { id: 'A', label: 'A', color: 'red', fullLabel: 'Alfa' },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => updateStatus(student, type.id as any)}
                                        className={cn(
                                            "w-10 h-10 sm:w-11 sm:h-11 rounded-lg font-bold text-sm sm:text-base border-2 transition-all flex items-center justify-center shadow-sm",
                                            student.status === type.id
                                                ? type.color === 'green' ? "bg-green-500 border-green-600 text-white scale-105" :
                                                    type.color === 'yellow' ? "bg-yellow-500 border-yellow-600 text-white scale-105" :
                                                        type.color === 'blue' ? "bg-blue-500 border-blue-600 text-white scale-105" :
                                                            "bg-red-500 border-red-600 text-white scale-105"
                                                : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50"
                                        )}
                                        title={type.fullLabel}
                                    >
                                        {type.label}
                                    </button>
                                ))}
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
