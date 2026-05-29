import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowRight, Building2, User, Mail, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name is too short'),
  adminName: z.string().min(2, 'Your name is too short'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  employeeRange: z.enum(['0-20', '21-50', '51-100', '100+']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      employeeRange: '0-20',
    },
  });

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await axios.post('/auth/register', data);
      toast.success('Registration successful! You can now sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">Join Lunch<span className="text-blue-600">OS</span></h1>
          <p className="text-gray-500 font-medium">Set up your company's lunch system in minutes</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onRegister)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('companyName')}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Acme Corp"
                />
              </div>
              {errors.companyName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.companyName.message}</p>}
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Admin Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('adminName')}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Jane Smith"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register('email')}
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="jane@company.com"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-bold text-gray-700 mb-1">Number of Employees</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['0-20', '21-50', '51-100', '100+'].map((range) => (
                  <label key={range} className="relative cursor-pointer">
                    <input
                      type="radio"
                      value={range}
                      {...register('employeeRange')}
                      className="peer sr-only"
                    />
                    <div className="p-3 text-center border-2 border-gray-100 rounded-xl peer-checked:border-blue-600 peer-checked:bg-blue-50 transition-all font-bold text-gray-600 peer-checked:text-blue-600">
                      {range}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Create My Account <ArrowRight className="w-5 h-5" /></>}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
