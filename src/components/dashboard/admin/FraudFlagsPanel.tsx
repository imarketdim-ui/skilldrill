import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, CheckCircle, Loader2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

interface FraudFlag {
  id: string;
  user_id: string;
  flag_type: string;
  description: string;
  severity: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: any;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null; skillspot_id: string };
}

const FLAG_TYPE_LABELS: Record<string, string> = {
  vip_spike: 'Всплеск VIP',
  concentration: 'Концентрация',
  clone_suspect: 'Подозрение на клон',
  cluster: 'Кластер',
  low_score_moderation: 'Низкий рейтинг',
  auto_blocked: 'Автоблокировка',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
};

const SEVERITY_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

export default function FraudFlagsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [resolving, setResolving] = useState<string | null>(null);

  const loadFlags = async () => {
    let query = supabase
      .from('fraud_flags')
      .select('*, profiles!fraud_flags_user_id_fkey(first_name, last_name, email, skillspot_id)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (filterSeverity !== 'all') query = query.eq('severity', filterSeverity);
    if (filterType !== 'all') query = query.eq('flag_type', filterType);

    const { data } = await query;
    setFlags((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadFlags(); }, [filterSeverity, filterType]);

  const resolveFlag = async (flagId: string) => {
    setResolving(flagId);
    try {
      const { error } = await supabase
        .from('fraud_flags')
        .update({ is_resolved: true, resolved_by: user!.id, resolved_at: new Date().toISOString() })
        .eq('id', flagId);
      if (error) throw error;
      toast({ title: 'Флаг закрыт' });
      await loadFlags();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    } finally { setResolving(null); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" /> Антифрод флаги
        </CardTitle>
        <CardDescription>Автоматически обнаруженные подозрительные паттерны поведения</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Серьёзность" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="info">Инфо</SelectItem>
              <SelectItem value="warning">Предупреждение</SelectItem>
              <SelectItem value="critical">Критический</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(FLAG_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : flags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flag className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Нет активных флагов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map(flag => {
              const SeverityIcon = SEVERITY_ICONS[flag.severity] || Info;
              return (
                <div key={flag.id} className={`p-4 rounded-lg border ${SEVERITY_COLORS[flag.severity] || ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <SeverityIcon className="w-5 h-5 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{FLAG_TYPE_LABELS[flag.flag_type] || flag.flag_type}</Badge>
                          <Badge variant="outline">{flag.severity}</Badge>
                        </div>
                        <p className="text-sm font-medium">{flag.description}</p>
                        <p className="text-xs opacity-75">
                          {flag.profiles?.first_name} {flag.profiles?.last_name} · {flag.profiles?.email} · {flag.profiles?.skillspot_id}
                        </p>
                        <p className="text-xs opacity-60">{new Date(flag.created_at).toLocaleString('ru')}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveFlag(flag.id)}
                      disabled={resolving === flag.id}
                    >
                      {resolving === flag.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Закрыть
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
