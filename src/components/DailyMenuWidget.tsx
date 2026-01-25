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
        <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4 mb-6">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    🍽️ Menu Hari Ini
                </h3>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                        <Edit2 className="w-3 h-3" /> Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <textarea
                        value={menuItems}
                        onChange={(e) => setMenuItems(e.target.value)}
                        placeholder="Tulis menu hari ini... (Contoh: Nasi, Ayam Goreng, Sayur Asem, Jeruk)"
                        className="w-full text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="text-sm flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-gray-600"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                {photoUrl ? 'Ganti Foto' : 'Ambil/Upload Foto'}
                            </button>

                            {photoUrl && (
                                <button
                                    onClick={deletePhoto}
                                    disabled={loading}
                                    className="text-sm flex items-center justify-center px-3 py-2 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                    title="Hapus Foto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                        />

                        <div className="flex-1"></div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-sm px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => saveAll()}
                                disabled={loading}
                                className="text-sm flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                    {photoUrl ? (
                        <div className="w-full sm:w-1/3 aspect-video sm:aspect-square rounded-lg overflow-hidden bg-gray-100 border relative group">
                            <img
                                src={photoUrl}
                                alt="Menu"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="hidden sm:flex w-24 h-24 rounded-lg bg-gray-100 items-center justify-center text-gray-300">
                            <ImageIcon className="w-8 h-8" />
                        </div>
                    )}

                    <div className="flex-1">
                        {menuItems ? (
                            <p className="text-gray-700 whitespace-pre-line">{menuItems}</p>
                        ) : (
                            <p className="text-gray-400 italic text-sm">Belum ada info menu.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
