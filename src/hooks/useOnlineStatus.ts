import { useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => (isBrowser ? navigator.onLine : true));

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
