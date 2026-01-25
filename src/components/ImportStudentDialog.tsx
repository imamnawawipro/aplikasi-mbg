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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card w-full max-w-lg rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold">Import Siswa dari Excel</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Instructions */}
                    <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-800">
                        <p className="font-semibold mb-1">Format File Excel:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                            <li>Kolom A: <strong>Nama Siswa</strong></li>
                            <li>Kolom B: <strong>Kelas</strong></li>
                            <li>Kolom C: <strong>L/P</strong> (Opsional, default L)</li>
                            <li>Baris pertama sebagai Header (diabaikan).</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {!parsedData.length ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-3" />
                            <p className="text-sm font-medium text-gray-700">Klik untuk upload file Excel (.xlsx)</p>
                            <p className="text-xs text-gray-500 mt-1">Maksimal 5MB</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Preview Data ({parsedData.length} siswa)</span>
                                <button
                                    onClick={() => {
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                        setParsedData([]);
                                    }}
                                    className="text-xs text-red-500 hover:underline"
                                >
                                    Ganti File
                                </button>
                            </div>
                            <div className="border rounded-md max-h-60 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 font-medium text-gray-700">Nama</th>
                                            <th className="px-4 py-2 font-medium text-gray-700">Kelas</th>
                                            <th className="px-4 py-2 font-medium text-gray-700">L/P</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedData.map((student, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">{student.name}</td>
                                                <td className="px-4 py-2">{student.class}</td>
                                                <td className="px-4 py-2">{student.gender}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={parsedData.length === 0 || loading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md transition-colors",
                            (parsedData.length === 0 || loading) ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90"
                        )}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Import Data
                    </button>
                </div>
            </div>
        </div>
    );
}
