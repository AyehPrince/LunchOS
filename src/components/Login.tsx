import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  otp: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, requestOtp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    if (!showOtpInput) {
      const success = await requestOtp(data.identifier);
      if (success) {
        setShowOtpInput(true);
        toast.success('OTP sent to your device (check console)');
      } else {
        toast.error('Failed to send OTP. Check if user exists.');
      }
    } else {
      const success = await login(data.identifier, data.otp || '');
      if (success) {
        toast.success('Welcome back!');
        // Route super admin to super-admin dashboard, standard admins to /admin, others to /
        const savedUser = localStorage.getItem('lunchos_user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          if (userObj.role === 'super_admin') {
            navigate('/super-admin');
          } else if (userObj.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/');
        }
      } else {
        toast.error('Invalid OTP');
      }
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
              {showOtpInput ? 'Enter the magic code we just sent' : 'Enter your email or phone to get started'}
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onLogin)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone
              </label>
              <input
                {...register('identifier')}
                type="text"
                className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900"
                placeholder="you@company.com"
                disabled={isLoading || showOtpInput}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.identifier.message}</p>
              )}
            </div>

            {showOtpInput && (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  OTP Code
                </label>
                <input
                  {...register('otp')}
                  type="text"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center tracking-widest text-2xl font-bold text-gray-950"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                  autoFocus
                />
                {errors.otp && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.otp.message}</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {showOtpInput ? 'Verify & Sign In' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {showOtpInput && (
            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={async () => {
                  const identifier = getValues('identifier');
                  if (!identifier) {
                    toast.error('Identifier is empty');
                    return;
                  }
                  setIsLoading(true);
                  const success = await requestOtp(identifier);
                  if (success) {
                    toast.success('A new OTP code has been sent (check console)');
                  } else {
                    toast.error('Failed to send a new OTP.');
                  }
                  setIsLoading(false);
                }}
                className="w-full py-2.5 text-center text-sm font-black text-gray-700 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
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
                Wait, I used the wrong target identifier
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-gray-150/60 mt-4 text-center space-y-4">
            {!showOtpInput && (
              <p className="text-sm text-gray-500 font-medium">
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
