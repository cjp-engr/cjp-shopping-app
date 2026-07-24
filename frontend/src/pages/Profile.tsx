import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatDate } from '../utils/formatters';
import {
  User,
  Mail,
  MapPin,
  Edit,
  Save,
  X,
  LogOut,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  Store,
  Camera,
  Trash2,
  PlusCircle,
  Star,
  Users,
} from 'lucide-react';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import orderService from '../services/orderService';
import type { SavedAddress } from '../types/user';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, uploadAvatar, addAddress, deleteAddress, setDefaultAddress } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<{ totalOrders: number; totalSpent: number } | null>(null);
  const [followStats, setFollowStats] = useState<{ followersCount: number; followingCount: number } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
  });

  useEffect(() => {
    const loadOrderSummary = async () => {
      if (user) {
        try {
          const summary = await orderService.getOrderSummaryAsync(user.id);
          setOrderSummary(summary);
        } catch (error) {
          console.error('Failed to load order summary:', error);
        }
      }
    };

    loadOrderSummary();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadFollowStats = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.USER_PROFILE(user.id), {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) {
          setFollowStats({
            followersCount: data.user.followersCount,
            followingCount: data.user.followingCount,
          });
        }
      } catch {
        // non-critical
      }
    };
    loadFollowStats();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploadingAvatar(true);
    setError(null);

    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarPreview(user?.avatar || null);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
    });
    setAvatarPreview(user?.avatar || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      setLoading(true);
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
      } as any);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          <ShoppingBag className="w-4 h-4 mr-2" />
          Order History
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">Profile Updated</h3>
            <p className="text-sm text-green-700 mt-1">
              Your profile has been successfully updated.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Update Failed</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card padding="lg">
            <div className="text-center">
              {/* Avatar with upload button */}
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center ring-4 ring-white shadow-md">
                  {uploadingAvatar ? (
                    <div className="w-full h-full flex items-center justify-center bg-primary-50">
                      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-primary-600" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      aria-label="Upload profile photo"
                      disabled={uploadingAvatar}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                      aria-label="Change profile photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {isEditing && (
                <p className="text-xs text-gray-400 mb-3">
                  {uploadingAvatar ? 'Uploading to Cloudinary…' : 'Click the camera to upload (max 2 MB)'}
                </p>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Member since {formatDate(user.createdAt)}
              </p>

              {/* Followers / Following */}
              {followStats !== null && (
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/users/${user.id}`}
                    className="text-center hover:opacity-70 transition-opacity group"
                  >
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-none group-hover:text-primary-600">
                      {followStats.followersCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Followers</p>
                  </Link>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                  <Link
                    to={`/users/${user.id}`}
                    className="text-center hover:opacity-70 transition-opacity group"
                  >
                    <p className="text-lg font-bold text-gray-900 dark:text-white leading-none group-hover:text-primary-600">
                      {followStats.followingCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Following</p>
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <Button
                fullWidth
                variant={isEditing ? 'secondary' : 'primary'}
                onClick={() => setIsEditing(!isEditing)}
                disabled={loading || uploadingAvatar}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel Editing
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>

              {user.role === 'seller' ? (
                <Button fullWidth variant="outline" onClick={() => navigate('/seller')}>
                  <Store className="w-4 h-4 mr-2" />
                  Seller Dashboard
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outline"
                  disabled={loading}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await updateProfile({ role: 'seller' } as any);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Become a Seller
                </Button>
              )}

              <Button fullWidth variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </Card>

          {/* Order Stats */}
          {orderSummary && (
            <Card padding="lg">
              <h3 className="font-semibold text-gray-900 mb-4">Order Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="font-bold text-gray-900">
                    {orderSummary.totalOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-bold text-primary-600">
                    ${orderSummary.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
              <Button
                fullWidth
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/orders')}
              >
                View All Orders
              </Button>
            </Card>
          )}
        </div>

        {/* Profile Details Form */}
        <div className="lg:col-span-2 space-y-6">
          <SavedAddressesCard
            addresses={user.savedAddresses ?? []}
            onAdd={addAddress}
            onDelete={deleteAddress}
            onSetDefault={setDefaultAddress}
          />
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Personal Information
              </h2>
              {isEditing && (
                <Button
                  type="submit"
                  form="profile-form"
                  loading={loading}
                  disabled={loading || uploadingAvatar}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>

            <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    fullWidth
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    fullWidth
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    fullWidth
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium select-none">
                        +63
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={!isEditing}
                        placeholder="9XX XXX XXXX"
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Street Address"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="123 Main St"
                    fullWidth
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="New York"
                      fullWidth
                    />
                    <Input
                      label="State/Province"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="NY"
                      fullWidth
                    />
                  </div>
                  <Input
                    label="ZIP/Postal Code"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="1000"
                    fullWidth
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading || uploadingAvatar}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading} disabled={loading || uploadingAvatar}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── Saved Addresses Card ──────────────────────────────────────────────────────

interface SavedAddressesCardProps {
  addresses: SavedAddress[];
  onAdd: (addr: Omit<SavedAddress, '_id' | 'isDefault'> & { setAsDefault?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

const SavedAddressesCard: React.FC<SavedAddressesCardProps> = ({ addresses, onAdd, onDelete, onSetDefault }) => {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: 'Home', street: '', city: '', state: '', zipCode: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.street.trim() || !form.city.trim()) {
      setFormError('Street and City are required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onAdd({ label: form.label || 'Home', street: form.street.trim(), city: form.city.trim(), state: form.state.trim(), zipCode: form.zipCode.trim(), country: '' });
      setForm({ label: 'Home', street: '', city: '', state: '', zipCode: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await onDelete(id); } catch { /* ignore */ } finally { setDeletingId(null); }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try { await onSetDefault(id); } catch { /* ignore */ } finally { setSettingDefaultId(null); }
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Saved Addresses
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <PlusCircle className="w-4 h-4 mr-1" />
          {showForm ? 'Cancel' : 'Add Address'}
        </Button>
      </div>

      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No saved addresses yet.</p>
      )}
      <div className="space-y-3 mb-4">
        {addresses.map(addr => (
          <div key={addr._id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{addr.label}</span>
                {addr.isDefault && (
                  <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">Default</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {[addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr._id)}
                  disabled={settingDefaultId === addr._id}
                  title="Set as default"
                  className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-40"
                >
                  <Star className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(addr._id)}
                disabled={deletingId === addr._id}
                title="Delete address"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          )}
          <Input label="Label" name="label" value={form.label} onChange={handleChange} placeholder='e.g. Home, Office' fullWidth />
          <Input label="Street Address" name="street" value={form.street} onChange={handleChange} placeholder="123 Main St" fullWidth required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="City" name="city" value={form.city} onChange={handleChange} placeholder="Manila" fullWidth required />
            <Input label="State/Province" name="state" value={form.state} onChange={handleChange} placeholder="Metro Manila" fullWidth />
          </div>
          <Input label="ZIP Code" name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="1000" fullWidth />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setFormError(null); }}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save Address
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
