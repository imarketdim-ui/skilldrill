import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/landing/Header';

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading');
  const [message, setMessage] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Недействительная ссылка приглашения.');
      return;
    }

    if (!user) {
      setStatus('auth_required');
      return;
    }

    const accept = async () => {
      try {
        const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
        if (error) throw error;

        const result = data as any;
        // Get org name
        const { data: org } = await supabase
          .from('business_locations')
          .select('name')
          .eq('id', result.organization_id)
          .maybeSingle();

        setOrgName(org?.name || 'Организация');
        setStatus('success');
        setMessage(`Вы добавлены в команду как ${result.role === 'master' ? 'Мастер' : 'Менеджер'}.`);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Ошибка при принятии приглашения.');
      }
    };

    accept();
  }, [token, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Обработка приглашения...</p>
              </>
            )}

            {status === 'auth_required' && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-bold">Необходима авторизация</h2>
                <p className="text-muted-foreground">
                  Войдите в аккаунт, чтобы принять приглашение.
                </p>
                <Button onClick={() => navigate(`/auth?redirect=/accept-invite/${token}`)}>
                  Войти
                </Button>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-bold">Приглашение принято!</h2>
                <p className="text-muted-foreground">
                  {message} Организация: <strong>{orgName}</strong>
                </p>
                <Button onClick={() => navigate('/dashboard')}>
                  Перейти в личный кабинет
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-destructive" />
                <h2 className="text-xl font-bold">Ошибка</h2>
                <p className="text-muted-foreground">{message}</p>
                <Button variant="outline" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> На главную
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AcceptInvite;
