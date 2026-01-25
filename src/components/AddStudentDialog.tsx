import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface AddStudentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddStudentDialog({ isOpen, onClose, onSuccess }: AddStudentDialogProps) {
    const [name, setName] = useState('');
    const [className, setClassName] = useState('');
    const [gender, setGender] = useState<'L' | 'P'>('L');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !className.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('students')
                .insert([{
                    name: name.trim(),
                    class: className.trim(),
                    gender: gender
                }]);

            if (error) throw error;

            // Reset form & close
            setName('');
            setClassName('');
            setGender('L');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adding student:', err);
            setError(err.message || 'Gagal menambahkan siswa.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card w-full max-w-sm rounded-lg shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Tambah Siswa</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-700">
                            Nama Lengkap
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="class" className="text-sm font-medium text-gray-700">
                                Kelas
                            </label>
                            <input
                                id="class"
                                type="text"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="10 IPA 1"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="gender" className="text-sm font-medium text-gray-700">
                                Jenis Kelamin
                            </label>
                            <select
                                id="gender"
                                value={gender}
                                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                            >
                                <option value="L">Laki-laki (L)</option>
                                <option value="P">Perempuan (P)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md transition-colors",
                                loading ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Simpan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
