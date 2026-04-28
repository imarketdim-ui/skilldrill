import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { consumePostAuthRedirect } from '@/lib/oauth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  const providerError = useMemo(() => {
    const error = searchParams.get('error');
    const description = searchParams.get('error_description');

    if (!error && !description) {
      return null;
    }

    return description || error;
  }, [searchParams]);

  useEffect(() => {
    if (providerError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [providerError]);

  useEffect(() => {
    if (!user) {
      return;
    }

    navigate(consumePostAuthRedirect('/dashboard'), { replace: true });
  }, [navigate, user]);

  if (providerError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Не удалось завершить вход</CardTitle>
            </div>
            <CardDescription>
              Провайдер вернул ошибку при авторизации. Проверьте настройки OAuth и попробуйте снова.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
              {providerError}
            </div>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Вернуться ко входу
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Завершаем вход</CardTitle>
            <CardDescription>
              Подтверждаем авторизацию и перенаправляем вас в кабинет.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Подождите пару секунд...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Авторизация не завершилась</CardTitle>
          <CardDescription>
            Мы не получили активную сессию после возврата от провайдера.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Обычно это означает, что в Google OAuth или VK ID не добавлен текущий redirect URL
            для <code className="mx-1 rounded bg-muted px-1 py-0.5">/auth/callback</code>.
          </p>
          {timedOut && (
            <div className="rounded-lg border bg-muted/40 p-4">
              Проверьте настройки провайдера и затем повторите вход. После настройки страницу
              callback можно использовать без дополнительных изменений кода.
            </div>
          )}
          <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к авторизации
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
