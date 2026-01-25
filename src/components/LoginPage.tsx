import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, LogIn, Lock, Mail, UserPlus, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                // Cek apakah butuh konfirmasi email
                if (data.session) {
                    setMessage({ type: 'success', text: 'Registrasi berhasil! Anda langsung masuk.' });
                } else if (data.user) {
                    setMessage({ type: 'success', text: 'Registrasi berhasil! Silakan cek email untuk konfirmasi (atau login di dashboard jika auto-confirm).' });
                    setIsLogin(true); // Switch back to login
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Header */}
                <div className={cn(
                    "p-8 text-center transition-colors duration-300",
                    isLogin ? "bg-gradient-to-r from-blue-600 to-indigo-700" : "bg-gradient-to-r from-indigo-600 to-purple-700"
                )}>
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        {isLogin ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-bold text-white transition-all">
                        {isLogin ? 'Login Guru' : 'Daftar Akun'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Si-MBG-E</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {message && (
                            <div className={cn(
                                "p-3 text-sm rounded-lg text-center flex items-center justify-center gap-2",
                                message.type === 'error' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                            )}>
                                {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 pl-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                                    placeholder="admin@mbg.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 pl-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-sans"
                                    placeholder={isLogin ? "••••••••" : "Min. 6 karakter"}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full py-3 px-4 text-white font-medium rounded-xl transition-all shadow-lg active:scale-95 mt-4",
                                isLogin
                                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20",
                                loading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Proses...
                                </span>
                            ) : (
                                isLogin ? "Masuk Aplikasi" : "Buat Akun"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-gray-500">
                        {isLogin ? (
                            <>
                                Belum punya akun?{' '}
                                <button
                                    onClick={() => { setIsLogin(false); setMessage(null); }}
                                    className="text-blue-600 font-bold hover:underline"
                                >
                                    Daftar di sini
                                </button>
                            </>
                        ) : (
                            <>
                                Sudah punya akun?{' '}
                                <button
                                    onClick={() => { setIsLogin(true); setMessage(null); }}
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    Login di sini
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
