import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Ban, Plus, Trash2, Search } from 'lucide-react';

const TeachingBlacklist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user) fetchBlacklist();
  }, [user]);

  const fetchBlacklist = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('blacklists')
      .select('*, profiles:blocked_id(first_name, last_name, email, skillspot_id)')
      .eq('blocker_id', user.id);
    setEntries(data || []);
    setLoading(false);
  };

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, skillspot_id')
      .eq('skillspot_id', searchId.trim())
      .maybeSingle();
    
    if (data) {
      setFoundUser(data);
    } else {
      toast({ title: 'Пользователь не найден', variant: 'destructive' });
    }
  };

  const addToBlacklist = async () => {
    if (!user || !foundUser) return;
    const { error } = await supabase.from('blacklists').insert({
      blocker_id: user.id,
      blocked_id: foundUser.id,
      reason: reason || null,
    });

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Добавлен в чёрный список' });
      setIsOpen(false);
      setFoundUser(null);
      setSearchId('');
      setReason('');
      fetchBlacklist();
    }
  };

  const removeFromBlacklist = async (id: string) => {
    await supabase.from('blacklists').delete().eq('id', id);
    toast({ title: 'Удалён из чёрного списка' });
    fetchBlacklist();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Чёрный список</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить в чёрный список</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID пользователя (SkillSpot ID)</Label>
                <div className="flex gap-2">
                  <Input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Введите SkillSpot ID" />
                  <Button variant="outline" onClick={searchUser}><Search className="h-4 w-4" /></Button>
                </div>
              </div>
              {foundUser && (
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {foundUser.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{foundUser.first_name} {foundUser.last_name}</p>
                        <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Причина</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Причина блокировки..." />
              </div>
              <Button className="w-full" onClick={addToBlacklist} disabled={!foundUser}>Добавить</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Загрузка...</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Ban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Чёрный список пуст</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const profile = entry.profiles as any;
            return (
              <Card key={entry.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-destructive/10 text-destructive">
                          {profile?.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email} · ID: {profile?.skillspot_id}</p>
                        {entry.reason && <p className="text-sm mt-1">Причина: {entry.reason}</p>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeFromBlacklist(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeachingBlacklist;
