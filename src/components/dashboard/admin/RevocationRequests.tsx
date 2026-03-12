import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldBan, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  isSuperAdmin?: boolean;
}

const RevocationRequests = ({ isSuperAdmin = false }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; request: any }>({ open: false, request: null });
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('revocation_requests')
      .select('*, reason:revocation_reasons(name), requester:profiles!revocation_requests_requested_by_fkey(first_name, last_name), target:profiles!revocation_requests_target_user_id_fkey(first_name, last_name, email, skillspot_id)')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const handleReview = async (approve: boolean) => {
    if (!reviewDialog.request) return;
    setSubmitting(true);
    try {
      const req = reviewDialog.request;

      // Update request status
      const { error } = await supabase
        .from('revocation_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment || null,
        })
        .eq('id', req.id);

      if (error) throw error;

      if (approve) {
        // Archive and deactivate
        if (req.target_type === 'master') {
          // Find master profile by user_id if entity_id is null
          let entityId = req.target_entity_id;
          if (!entityId) {
            const { data: mp } = await supabase.from('master_profiles').select('id').eq('user_id', req.target_user_id).maybeSingle();
            entityId = mp?.id;
          }
          if (entityId) {
            const { data: mp } = await supabase.from('master_profiles').select('*').eq('id', entityId).single();
            if (mp) {
              await supabase.from('revocation_archive').insert({
                user_id: req.target_user_id,
                entity_type: 'master',
                entity_data: mp as any,
                revocation_request_id: req.id,
              });
              await supabase.from('master_profiles').update({ is_active: false, suspended_at: new Date().toISOString() }).eq('id', entityId);
            }
          }
          // Always delete the role regardless of entity
          await supabase.from('user_roles').delete().eq('user_id', req.target_user_id).eq('role', 'master');
        } else if (req.target_type === 'business') {
          let entityId = req.target_entity_id;
          if (!entityId) {
            const { data: bl } = await supabase.from('business_locations').select('id').eq('owner_id', req.target_user_id).maybeSingle();
            entityId = bl?.id;
          }
          if (entityId) {
            const { data: bl } = await supabase.from('business_locations').select('*').eq('id', entityId).single();
            if (bl) {
              await supabase.from('revocation_archive').insert({
                user_id: req.target_user_id,
                entity_type: 'business',
                entity_data: bl as any,
                revocation_request_id: req.id,
              });
              await supabase.from('business_locations').update({ is_active: false, suspended_at: new Date().toISOString() }).eq('id', entityId);
            }
          }
          await supabase.from('user_roles').delete().eq('user_id', req.target_user_id).eq('role', 'business_owner');
        } else if (req.target_type === 'network') {
          let entityId = req.target_entity_id;
          if (!entityId) {
            const { data: net } = await supabase.from('networks').select('id').eq('owner_id', req.target_user_id).maybeSingle();
            entityId = net?.id;
          }
          if (entityId) {
            const { data: net } = await supabase.from('networks').select('*').eq('id', entityId).single();
            if (net) {
              await supabase.from('revocation_archive').insert({
                user_id: req.target_user_id,
                entity_type: 'network',
                entity_data: net as any,
                revocation_request_id: req.id,
              });
              await supabase.from('networks').update({ is_active: false, suspended_at: new Date().toISOString() }).eq('id', entityId);
            }
          }
          await supabase.from('user_roles').delete().eq('user_id', req.target_user_id).eq('role', 'network_owner');
        }
      }

      toast({ title: approve ? 'Права аннулированы' : 'Заявка отклонена' });
      setReviewDialog({ open: false, request: null });
      setReviewComment('');
      loadRequests();
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const typeLabels: Record<string, string> = { master: 'Мастер', business: 'Бизнес', network: 'Сеть' };
  const statusLabels: Record<string, string> = { pending: 'Ожидает', approved: 'Одобрена', rejected: 'Отклонена' };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldBan className="h-5 w-5" /> Заявки на аннулирование
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет заявок</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{typeLabels[req.target_type]}</Badge>
                        <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'destructive' : 'secondary'}>
                          {statusLabels[req.status]}
                        </Badge>
                      </div>
                      <p className="font-medium">{req.target?.first_name} {req.target?.last_name}</p>
                      <p className="text-sm text-muted-foreground">{req.target?.email} • {req.target?.skillspot_id}</p>
                      <p className="text-sm mt-1"><span className="font-medium">Причина:</span> {req.reason?.name}</p>
                      {req.description && <p className="text-sm text-muted-foreground mt-1">{req.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Подал: {req.requester?.first_name} {req.requester?.last_name} • {new Date(req.created_at).toLocaleDateString('ru')}
                      </p>
                    </div>
                    {isSuperAdmin && req.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => { setReviewDialog({ open: true, request: req }); setReviewComment(''); }}>
                        Рассмотреть
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialog.open} onOpenChange={(o) => setReviewDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Рассмотрение заявки</DialogTitle>
          </DialogHeader>
          {reviewDialog.request && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{reviewDialog.request.target?.first_name} {reviewDialog.request.target?.last_name}</p>
                <p className="text-sm">{reviewDialog.request.target?.email}</p>
                <Badge className="mt-1">{typeLabels[reviewDialog.request.target_type]}</Badge>
              </div>
              <div>
                <p className="text-sm"><span className="font-medium">Причина:</span> {reviewDialog.request.reason?.name}</p>
                {reviewDialog.request.description && (
                  <p className="text-sm text-muted-foreground mt-1">{reviewDialog.request.description}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Комментарий</label>
                <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Комментарий к решению..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleReview(true)} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-1" /> Подтвердить аннулирование
            </Button>
            <Button variant="outline" onClick={() => handleReview(false)} disabled={submitting}>
              <XCircle className="h-4 w-4 mr-1" /> Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RevocationRequests;
