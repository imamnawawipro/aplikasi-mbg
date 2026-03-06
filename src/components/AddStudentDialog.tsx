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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-xl border border-white/20 w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/50 bg-white/50">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Tambah Siswa</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100/80 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2.5">
                        <label htmlFor="name" className="text-sm font-semibold text-gray-700 ml-1">
                            Nama Lengkap
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2.5">
                            <label htmlFor="class" className="text-sm font-semibold text-gray-700 ml-1">
                                Kelas
                            </label>
                            <input
                                id="class"
                                type="text"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="10 IPA 1"
                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <div className="space-y-2.5">
                            <label htmlFor="gender" className="text-sm font-semibold text-gray-700 ml-1">
                                Jenis Kelamin
                            </label>
                            <select
                                id="gender"
                                value={gender}
                                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 cursor-pointer appearance-none"
                            >
                                <option value="L">Laki-laki (L)</option>
                                <option value="P">Perempuan (P)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end border-t border-gray-100/50 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl transition-all shadow-md shadow-emerald-500/20",
                                loading ? "opacity-70 cursor-not-allowed" : "hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Simpan</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
