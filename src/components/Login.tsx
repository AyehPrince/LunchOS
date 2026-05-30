import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../lib/axios';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  otp: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usePinLogin, setUsePinLogin] = useState(false);
  const [pin, setPin] = useState('');
  const { login, requestOtp, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleRedirect = (role: string) => {
    if (role === 'super_admin') navigate('/super-admin');
    else if (role === 'admin') navigate('/admin');
    else if (role === 'vendor') navigate('/vendor');
    else navigate('/dashboard');
  };

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    if (!showOtpInput) {
      const success = await requestOtp(data.identifier);
      if (success) {
        setShowOtpInput(true);
        toast.success('OTP sent to your device — check your email or phone');
      } else {
        toast.error('Failed to send OTP. Check if user exists.');
      }
    } else {
      const success = await login(data.identifier, data.otp || '');
      if (success) {
        toast.success('Welcome back!');
        const savedUser = localStorage.getItem('lunchos_user');
        if (savedUser) handleRedirect(JSON.parse(savedUser).role);
        else navigate('/');
      } else {
        toast.error('Invalid OTP');
      }
    }
    setIsLoading(false);
  };

  const onPinLogin = async () => {
    const identifier = getValues('identifier');
    if (!identifier) return toast.error('Please enter your email or phone first');
    if (!pin || pin.length !== 4) return toast.error('PIN must be 4 digits');

    setIsLoading(true);
    try {
      const res = await axios.post('/auth/login-pin', { identifier, pin });
const { token, user } = res.data;
loginWithToken(token, user);
toast.success('Welcome back!');
handleRedirect(user.role);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid PIN');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            Lunch<span className="text-blue-600">OS</span>
          </h1>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-700">Sign in to your account</h2>
            <p className="text-sm text-gray-500 font-medium">
              {usePinLogin ? 'Enter your email/phone and PIN' : showOtpInput ? 'Enter the magic code we just sent' : 'Enter your email or phone to get started'}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onLogin)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone
              </label>
              <input
                {...register('identifier')}
                type="text"
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900"
                placeholder="you@company.com"
                disabled={isLoading || (showOtpInput && !usePinLogin)}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.identifier.message}</p>
              )}
            </div>

            {!usePinLogin && showOtpInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                <input
                  {...register('otp')}
                  type="text"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center tracking-widest text-2xl font-bold text-gray-950"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}

            {usePinLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">4-Digit PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center tracking-widest text-2xl font-bold text-gray-950"
                  placeholder="••••"
                  maxLength={4}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            )}
          </div>

          {!usePinLogin ? (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>{showOtpInput ? 'Verify & Sign In' : 'Continue'}<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPinLogin}
              disabled={isLoading || pin.length !== 4}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><KeyRound className="w-4 h-4" /> Sign In with PIN</>
              )}
            </button>
          )}

          {!usePinLogin && showOtpInput && (
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  const identifier = getValues('identifier');
                  if (!identifier) return toast.error('Identifier is empty');
                  setIsLoading(true);
                  const success = await requestOtp(identifier);
                  if (success) toast.success('A new OTP has been sent');
                  else toast.error('Failed to send a new OTP.');
                  setIsLoading(false);
                }}
                className="w-full py-2.5 text-center text-sm font-black text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                disabled={isLoading}
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => setShowOtpInput(false)}
                className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-500 py-1 cursor-pointer"
                disabled={isLoading}
              >
                Wait, I used the wrong identifier
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
            <button
              type="button"
              onClick={() => { setUsePinLogin(!usePinLogin); setShowOtpInput(false); setPin(''); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {usePinLogin ? 'Login with OTP instead' : 'Login with PIN instead'}
            </button>

            {!showOtpInput && !usePinLogin && (
              <p className="text-sm text-gray-500 font-medium text-center">
                Need LunchOS for your office?{' '}
                <Link to="/register" className="text-blue-600 font-black hover:underline">
                  Register your company
                </Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}