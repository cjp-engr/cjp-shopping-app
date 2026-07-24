import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserCircle, UserPlus, UserMinus, Users, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import type { PublicUser } from '../types/user';

type Tab = 'followers' | 'following';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [tabUsers, setTabUsers] = useState<PublicUser[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('followers');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === id;

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.USER_PROFILE(id), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setProfile(data.user);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTab = useCallback(async (tab: Tab) => {
    if (!id) return;
    setTabLoading(true);
    try {
      const url =
        tab === 'followers'
          ? API_ENDPOINTS.USER_FOLLOWERS(id)
          : API_ENDPOINTS.USER_FOLLOWING(id);
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTabUsers(data.users);
    } finally {
      setTabLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { fetchTab(activeTab); }, [fetchTab, activeTab]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      const method = profile.isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(API_ENDPOINTS.USER_FOLLOW(profile.id), {
        method,
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) =>
          prev
            ? { ...prev, isFollowing: data.isFollowing, followersCount: data.followersCount }
            : prev
        );
        // Refresh the current tab so counts reflect the change
        fetchTab(activeTab);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTabFollowToggle = async (user: PublicUser) => {
    try {
      const method = user.isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(API_ENDPOINTS.USER_FOLLOW(user.id), {
        method,
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setTabUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, isFollowing: data.isFollowing, followersCount: data.followersCount }
              : u
          )
        );
      }
    } catch {
      // silently ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <UserCircle className="w-16 h-16 text-gray-300" />
        <p className="text-gray-600 dark:text-gray-400">{error ?? 'User not found'}</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center ring-2 ring-primary-100 dark:ring-primary-900">
                <span className="text-2xl font-bold text-primary-600">
                  {profile.firstName[0]}{profile.lastName[0]}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {profile.firstName} {profile.lastName}
            </h1>
            <span
              className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                profile.role === 'seller'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
              }`}
            >
              {profile.role === 'seller' ? <ShoppingBag className="w-3 h-3" /> : <UserCircle className="w-3 h-3" />}
              {profile.role === 'seller' ? 'Seller' : 'Buyer'}
            </span>

            {/* Stats */}
            <div className="flex gap-5 mt-3">
              <button
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => setActiveTab('followers')}
              >
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                  {profile.followersCount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Followers</p>
              </button>
              <button
                className="text-center hover:opacity-70 transition-opacity"
                onClick={() => setActiveTab('following')}
              >
                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                  {profile.followingCount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Following</p>
              </button>
            </div>
          </div>

          {/* Follow button */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                profile.isFollowing
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              } disabled:opacity-50`}
            >
              {followLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : profile.isFollowing ? (
                <UserMinus className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {profile.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(['followers', 'following'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Users className="w-4 h-4" />
                {tab === 'followers' ? `Followers (${profile.followersCount})` : `Following (${profile.followingCount})`}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {tabLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : tabUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400 dark:text-gray-500">
              <Users className="w-10 h-10" />
              <p className="text-sm">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            tabUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isOwn={currentUser?.id === user.id}
                onFollowToggle={() => handleTabFollowToggle(user)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isOwn,
  onFollowToggle,
}: {
  user: PublicUser;
  isOwn: boolean;
  onFollowToggle: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onFollowToggle();
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link to={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-600">
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
        </div>
      </Link>

      {!isOwn && (
        <button
          onClick={handleClick}
          disabled={loading}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            user.isFollowing
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          } disabled:opacity-50`}
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : user.isFollowing ? (
            <UserMinus className="w-3 h-3" />
          ) : (
            <UserPlus className="w-3 h-3" />
          )}
          {user.isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
    </div>
  );
}
