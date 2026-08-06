import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-testid="offline-banner"
      role="alert"
      className="w-full bg-yellow-400 text-yellow-900 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>You're offline. Check your connection.</span>
    </div>
  );
}
