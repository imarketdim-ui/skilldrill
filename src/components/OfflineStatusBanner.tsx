import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      window.setTimeout(() => setShowBackOnline(false), 2500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showBackOnline) return null;

  return (
    <div className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm shadow-lg ${
      isOnline ? 'bg-emerald-600 text-white' : 'bg-foreground text-white'
    }`}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>{isOnline ? 'Соединение восстановлено' : 'Вы офлайн. Кэшированные страницы и данные всё ещё доступны.'}</span>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
