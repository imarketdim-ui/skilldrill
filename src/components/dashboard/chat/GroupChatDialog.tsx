import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2 } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  userId: string;
  onCreated: (groupId: string) => void;
}

const GroupChatDialog = ({ open, onOpenChange, contacts, userId, onCreated }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const { data: group, error: gErr } = await supabase
        .from('chat_groups' as any)
        .insert({ name: name.trim(), created_by: userId })
        .select('id')
        .single();
      if (gErr) throw gErr;

      const members = [userId, ...selected].map(uid => ({
        group_id: (group as any).id,
        user_id: uid,
      }));
      const { error: mErr } = await supabase.from('chat_group_members' as any).insert(members);
      if (mErr) throw mErr;

      toast({ title: 'Группа создана', description: name.trim() });
      setName('');
      setSelected([]);
      onOpenChange(false);
      onCreated((group as any).id);
    } catch (err: any) {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' });
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Создать группу
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Название группы"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-sm font-medium text-muted-foreground">Выберите участников:</p>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет контактов</p>
            ) : (
              contacts.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                  <span className="text-sm">{c.first_name || ''} {c.last_name || ''}</span>
                </label>
              ))
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length === 0}
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Создать ({selected.length} участников)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupChatDialog;
