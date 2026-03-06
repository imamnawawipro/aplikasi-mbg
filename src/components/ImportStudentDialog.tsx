import { useRef, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import { Upload, X, Loader2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface ImportStudentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedStudent {
    name: string;
    class: string;
    gender: string;
}

export function ImportStudentDialog({ isOpen, onClose, onSuccess }: ImportStudentDialogProps) {
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (fileInputRef.current) {
            // fileInputRef.current.value = ''; // Don't clear immediately so filename stays visible if we wanted to show it
        }
        setError(null);
        setParsedData([]);

        try {
            const rows = await readXlsxFile(selectedFile);

            // Basic validation: Expecting at least header + 1 row
            if (rows.length < 2) {
                throw new Error('File kosong atau format salah.');
            }

            // Assume format: Column A=Name, B=Class, C=Gender
            const data: ParsedStudent[] = rows.slice(1).map((row, index) => {
                const name = row[0]?.toString().trim();
                const className = row[1]?.toString().trim();
                let gender = row[2]?.toString().trim().toUpperCase() || 'L'; // Default L if missing

                // Normalize gender
                if (gender.startsWith('PEREMPUAN') || gender === 'CW') gender = 'P';
                else if (gender.startsWith('LAKI') || gender === 'CO') gender = 'L';
                else if (gender !== 'L' && gender !== 'P') gender = 'L'; // Fallback

                if (!name || !className) {
                    console.warn(`Row ${index + 2} skipped: Missing name or class.`);
                    return null;
                }
                return { name, class: className, gender };
            }).filter((item): item is ParsedStudent => item !== null);

            if (data.length === 0) {
                throw new Error('Tidak ada data valid yang ditemukan dalam file.');
            }

            setParsedData(data);
        } catch (err: any) {
            console.error('Error parsing excel:', err);
            setError(err.message || 'Gagal membaca file Excel. Pastikan format benar.');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('students')
                .insert(parsedData);

            if (error) throw error;

            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error bulk insert:', err);
            setError(err.message || 'Gagal menyimpan data ke database.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setParsedData([]);
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl border border-white/20 w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/50 bg-white/50 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        Import Data
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Instructions */}
                    <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm text-sm text-blue-800">
                        <p className="font-bold flex items-center gap-2 mb-2">
                            <span className="bg-blue-200 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-xs">i</span>
                            Format File Excel:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-blue-700/90 ml-2 font-medium">
                            <li>Kolom A: <strong className="text-blue-900">Nama Lengkap</strong></li>
                            <li>Kolom B: <strong className="text-blue-900">Kelas</strong> (contoh: 10 IPA 1)</li>
                            <li>Kolom C: <strong className="text-blue-900">Jenis Kelamin</strong> (L/P)</li>
                            <li className="text-xs text-blue-600/80 italic mt-2 !list-none">Baris pertama akan dianggap sebagai header dan diabaikan.</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm animate-in zoom-in-95">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {!parsedData.length ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group bg-gray-50/50"
                        >
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 group-hover:shadow-md transition-all">
                                <Upload className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-base font-bold text-gray-700 mb-1">Klik untuk upload file Excel</p>
                            <p className="text-sm font-medium text-gray-500">Mendukung file .xlsx dan .xls</p>
                            <span className="mt-4 px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">Maks. 5MB</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-sm font-bold text-gray-800 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                                    {parsedData.length} Data Siap Import
                                </span>
                                <button
                                    onClick={() => {
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                        setParsedData([]);
                                    }}
                                    className="text-sm font-semibold text-rose-500 hover:text-rose-600 hover:underline transition-colors"
                                >
                                    Pilih File Lain
                                </button>
                            </div>
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 sticky top-0 backdrop-blur-md z-10 border-b border-gray-200">
                                            <tr>
                                                <th className="px-5 py-3 font-bold text-gray-700 w-1/2">Nama Lengkap</th>
                                                <th className="px-5 py-3 font-bold text-gray-700 w-1/4">Kelas</th>
                                                <th className="px-5 py-3 font-bold text-gray-700 w-1/4">L/P</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {parsedData.map((student, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="px-5 py-2.5 font-medium text-gray-800">{student.name}</td>
                                                    <td className="px-5 py-2.5 text-gray-600">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-semibold">{student.class}</span>
                                                    </td>
                                                    <td className="px-5 py-2.5">
                                                        <span className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                            student.gender === 'P' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                                                        )}>
                                                            {student.gender}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all shadow-sm"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={parsedData.length === 0 || loading}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl transition-all shadow-md shadow-emerald-500/20",
                            (parsedData.length === 0 || loading) ? "opacity-70 cursor-not-allowed" : "hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                        )}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Simpan {parsedData.length > 0 && `(${parsedData.length})`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
