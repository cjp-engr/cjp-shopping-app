import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { UserPlus, AlertCircle, CheckCircle, ShoppingCart } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    else if (formData.firstName.trim().length < 2) newErrors.firstName = 'First name must be at least 2 characters';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (formData.lastName.trim().length < 2) newErrors.lastName = 'Last name must be at least 2 characters';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) newErrors.password = 'Password must contain uppercase, lowercase, and number';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!acceptTerms) newErrors.terms = 'You must accept the terms and conditions';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateForm()) return;
    try {
      setLoading(true);
      await signup({
        firstName: formData.firstName.trim(), lastName: formData.lastName.trim(),
        email: formData.email, password: formData.password, confirmPassword: formData.confirmPassword,
      });
      navigate('/');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to create account. Please try again.');
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

  const getStrength = (p: string) => {
    if (!p) return null;
    if (p.length < 6) return { label: 'Weak', color: 'bg-red-500', w: 'w-1/3' };
    if (p.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(p))
      return { label: 'Strong', color: 'bg-emerald-500', w: 'w-full' };
    if (p.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(p))
      return { label: 'Medium', color: 'bg-amber-500', w: 'w-2/3' };
    return { label: 'Weak', color: 'bg-red-500', w: 'w-1/3' };
  };

  const strength = getStrength(formData.password);

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-10 text-white">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <ShoppingCart className="w-7 h-7" />
              <span className="text-2xl font-extrabold tracking-tight">TokoMart</span>
            </div>
            <h2 className="text-3xl font-bold leading-snug mb-4">
              Join thousands of<br />happy shoppers.
            </h2>
            <p className="text-primary-100 text-sm leading-relaxed">
              Create a free account and start discovering amazing products with the best prices.
            </p>
          </div>
          <div className="space-y-3 mt-10">
            {[
              'Fast and secure checkout every time',
              'Full order tracking and history',
              'Exclusive deals and member offers',
              'Personalized product recommendations',
            ].map(text => (
              <div key={text} className="flex items-center gap-3 text-sm text-primary-100">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="bg-white dark:bg-gray-900 p-8 md:p-10 overflow-y-auto max-h-screen">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in instead
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-red-800">Signup Failed</p>
                  <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" type="text" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} placeholder="John" fullWidth required autoComplete="given-name" />
              <Input label="Last Name" type="text" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} placeholder="Doe" fullWidth required autoComplete="family-name" />
            </div>

            <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="you@example.com" fullWidth required autoComplete="email" />

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="Min. 8 characters"
                  fullWidth
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {strength && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.w}`} />
                    </div>
                    <span className={`text-xs font-semibold ${
                      strength.label === 'Weak' ? 'text-red-500' : strength.label === 'Medium' ? 'text-amber-500' : 'text-emerald-600'
                    }`}>{strength.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Use 8+ characters with uppercase, lowercase, and numbers</p>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
              fullWidth
              required
              autoComplete="new-password"
            />

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors(p => ({ ...p, terms: '' })); }}
                  className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  I agree to the{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">Terms and Conditions</a>
                  {' '}and{' '}
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">Privacy Policy</a>
                </span>
              </label>
              {errors.terms && <p className="mt-1 text-sm text-red-500">{errors.terms}</p>}
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              <UserPlus className="w-5 h-5 mr-2" />
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-300 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
