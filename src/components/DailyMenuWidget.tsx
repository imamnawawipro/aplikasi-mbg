import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Camera, Save, Loader2, Edit2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
// import { cn } from '../lib/utils';

interface DailyMenuWidgetProps {
    selectedDate: Date;
}

export function DailyMenuWidget({ selectedDate }: DailyMenuWidgetProps) {
    const [menuItems, setMenuItems] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    const [currentPath, setCurrentPath] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const { data } = await supabase.from('daily_menus').select('*').eq('date', formattedDate).single();
            if (data) {
                setMenuItems(data.menu_items || '');
                setCurrentPath(data.photo_path);
                setPhotoUrl(data.photo_path ? supabase.storage.from('meal-photos').getPublicUrl(data.photo_path).data.publicUrl : null);
            } else {
                setMenuItems('');
                setCurrentPath(null);
                setPhotoUrl(null);
            }
            setLoading(false);
        }
        load();
    }, [formattedDate]);

    async function saveAll(newPath?: string) {
        setLoading(true);
        const path_to_save = newPath !== undefined ? newPath : currentPath;

        const { error } = await supabase.from('daily_menus').upsert({
            date: formattedDate,
            menu_items: menuItems,
            photo_path: path_to_save
        }, { onConflict: 'date' }); // Explicit onConflict

        if (error) {
            alert('Gagal menyimpan database.');
            console.error(error);
        } else {
            setIsEditing(false);
            if (newPath) setCurrentPath(newPath);
        }
        setLoading(false);
    }

    async function deletePhoto() {
        if (!currentPath || !confirm('Yakin ingin menghapus foto menu ini?')) return;

        setLoading(true);
        try {
            // 1. Remove from Storage
            const { error: storageError } = await supabase.storage
                .from('meal-photos')
                .remove([currentPath]);

            if (storageError) console.error('Storage delete error:', storageError);
            // Continue anyway to clear DB reference

            // 2. Clear path in DB
            const { error } = await supabase.from('daily_menus').upsert({
                date: formattedDate,
                photo_path: null,
                menu_items: menuItems // Preserve menu text
            }, { onConflict: 'date' });

            if (error) throw error;

            setPhotoUrl(null);
            setCurrentPath(null);
            alert('Foto berhasil dihapus.');
        } catch (err: any) {
            console.error('Delete failed:', err);
            alert('Gagal menghapus foto.');
        } finally {
            setLoading(false);
        }
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${formattedDate}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('meal-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('meal-photos').getPublicUrl(filePath);
            setPhotoUrl(data.publicUrl);

            await saveAll(filePath);

        } catch (err: any) {
            console.error('Upload failed:', err);
            alert('Gagal upload. Pastikan Bucket "meal-photos" sudah dibuat dan Public.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 transition-all hover:shadow-md relative overflow-hidden group">
            {/* Subtle top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2.5">
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">🍽️</span>
                    Menu Hari Ini
                </h3>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Menu
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <textarea
                        value={menuItems}
                        onChange={(e) => setMenuItems(e.target.value)}
                        placeholder="Tulis menu hari ini... (Contoh: Nasi, Ayam Goreng, Sayur Asem, Jeruk)"
                        className="w-full text-sm p-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[100px] transition-all"
                    />

                    <div className="flex gap-2 flex-wrap">
                        {/* Camera Button */}
                        <button
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={uploading}
                            className="text-sm font-medium flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 shadow-sm transition-all active:scale-95"
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <Camera className="w-4 h-4 text-emerald-500" />}
                            Kamera
                        </button>

                        {/* Gallery Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="text-sm font-medium flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 shadow-sm transition-all active:scale-95"
                        >
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            Galeri
                        </button>

                        {photoUrl && (
                            <button
                                onClick={deletePhoto}
                                disabled={loading}
                                className="text-sm flex items-center justify-center px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                                title="Hapus Foto"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Camera Input (with capture) */}
                    <input
                        type="file"
                        ref={cameraInputRef}
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                    />

                    {/* Gallery Input (no capture = shows file picker) */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="flex-1"></div>

                    <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-sm font-medium px-4 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => saveAll()}
                            disabled={loading}
                            className="text-sm font-bold flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-5 animate-in fade-in duration-300">
                    {photoUrl ? (
                        <div className="w-full sm:w-1/3 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 relative group shadow-sm">
                            <img
                                src={photoUrl}
                                alt="Menu"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    ) : (
                        <div className="hidden sm:flex w-28 h-28 rounded-xl bg-gray-50 border border-dashed border-gray-200 items-center justify-center text-gray-300">
                            <ImageIcon className="w-8 h-8 opacity-50" />
                        </div>
                    )}

                    <div className="flex-1 py-1">
                        {menuItems ? (
                            <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-line">{menuItems}</p>
                        ) : (
                            <div className="h-full flex flex-col justify-center">
                                <p className="text-gray-400 font-medium">Belum ada info menu.</p>
                                <p className="text-xs text-gray-400 mt-1">Klik Edit Menu untuk menambahkan.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
