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
        <div className="relative min-h-screen min-h-[100dvh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 p-4">
            {/* Background Decorative Elements - reduced blur for mobile GPU */}
            <div className="absolute top-0 -left-10 w-60 h-60 bg-emerald-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-blob"></div>
            <div className="absolute top-0 -right-10 w-60 h-60 bg-teal-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-blob animate-delay-200"></div>
            <div className="absolute -bottom-20 left-20 w-60 h-60 bg-cyan-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-blob animate-delay-100"></div>

            <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-xl bg-white animate-fade-in-up">
                {/* Header */}
                <div className={cn(
                    "p-10 text-center transition-all duration-500 relative overflow-hidden",
                    isLogin ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-teal-600 to-cyan-700"
                )}>
                    {/* Inner subtle glow */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="bg-white/20 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-5 backdrop-blur-sm shadow-lg border border-white/30">
                        {isLogin ? <LogIn className="w-8 h-8 text-white -rotate-3" /> : <UserPlus className="w-8 h-8 text-white -rotate-3" />}
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">
                        {isLogin ? 'Login Guru' : 'Daftar Akun'}
                    </h2>
                    <p className="text-emerald-50 text-sm font-medium mt-2 tracking-wide uppercase">Si-MBG-E</p>
                </div>

                {/* Form */}
                <div className="p-6 sm:p-8 bg-white">
                    <form onSubmit={handleAuth} className="space-y-5">
                        {message && (
                            <div className={cn(
                                "p-4 text-sm font-medium rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95",
                                message.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            )}>
                                {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Loader2 className="w-5 h-5 shrink-0" />}
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 pl-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/80 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400 shadow-sm"
                                    placeholder="admin@mbg.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 pl-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/80 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400 shadow-sm"
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
                                "w-full py-4 px-4 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] mt-6 flex items-center justify-center gap-2",
                                isLogin
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
                                    : "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-600/25",
                                loading && "opacity-80 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Sedang Memproses...
                                </>
                            ) : (
                                <>
                                    {isLogin ? "Masuk Aplikasi" : "Buat Akun Baru"}
                                    {isLogin && <LogIn className="w-5 h-5 ml-1" />}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-gray-500">
                        {isLogin ? (
                            <>
                                Belum punya akun?{' '}
                                <button
                                    onClick={() => { setIsLogin(false); setMessage(null); }}
                                    className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline underline-offset-4 transition-colors p-2"
                                >
                                    Daftar di sini
                                </button>
                            </>
                        ) : (
                            <>
                                Sudah punya akun?{' '}
                                <button
                                    onClick={() => { setIsLogin(true); setMessage(null); }}
                                    className="text-teal-600 font-bold hover:text-teal-700 hover:underline underline-offset-4 transition-colors p-2"
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
