import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * DEPRECATED: RequestRole was an old "submit a request" flow.
 * The unified flow is /create-account. This page now silently
 * redirects, preserving any ?type= parameter.
 */
const RequestRole = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    const target = type ? `/create-account?type=${type}` : '/create-account';
    navigate(target, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Перенаправляем на страницу создания аккаунта…</p>
      </div>
    </div>
  );
};

export default RequestRole;
