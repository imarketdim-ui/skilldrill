import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Subscription = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/for-business#pricing', { replace: true }), 400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Перенаправляем на страницу тарифов…</p>
      </div>
    </div>
  );
};

export default Subscription;
