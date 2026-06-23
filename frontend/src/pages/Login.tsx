import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { LogIn, AlertCircle, ShoppingCart, ShieldCheck, Zap, BadgePercent } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = searchParams.get('redirect') || '/';

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateForm()) return;
    try {
      setLoading(true);
      await login({ email: formData.email, password: formData.password });
      navigate(redirectTo);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
        {/* Left Panel – Branding */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-10 text-white">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <ShoppingCart className="w-7 h-7" />
              <span className="text-2xl font-extrabold tracking-tight">TokoMart</span>
            </div>
            <h2 className="text-3xl font-bold leading-snug mb-4">
              Welcome back!<br />Great to see you.
            </h2>
            <p className="text-primary-100 text-sm leading-relaxed">
              Sign in to access your orders, track deliveries, and enjoy exclusive member deals.
            </p>
          </div>
          <div className="space-y-4 mt-10">
            {[
              { icon: Zap, text: 'Fast checkout experience' },
              { icon: ShieldCheck, text: 'Secure 256-bit encrypted login' },
              { icon: BadgePercent, text: 'Member-exclusive offers' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-primary-100">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel – Form */}
        <div className="bg-white dark:bg-gray-900 p-8 md:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sign in to your account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500">
                Sign up for free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-red-800">Login Failed</p>
                  <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                </div>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              fullWidth
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="••••••••"
                fullWidth
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                Forgot password?
              </a>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              <LogIn className="w-5 h-5 mr-2" />
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
