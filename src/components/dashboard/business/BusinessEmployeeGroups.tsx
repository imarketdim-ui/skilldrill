import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Trash2, Award } from 'lucide-react';
import { fetchBusinessSettingsSections, updateBusinessSettingsSection } from '@/lib/businessSettings';

interface Props { businessId: string; }

interface EmployeeGroup {
  id: string; name: string; premium: number; isSystem: boolean;
}

const systemGroups: EmployeeGroup[] = [
  { id: 'trainee', name: 'Стажёр', premium: 0, isSystem: true },
  { id: 'specialist', name: 'Специалист', premium: 5, isSystem: true },
  { id: 'master', name: 'Мастер', premium: 10, isSystem: true },
  { id: 'senior', name: 'Старший мастер', premium: 15, isSystem: true },
];

const BusinessEmployeeGroups = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<EmployeeGroup[]>(systemGroups);
  const [customGroups, setCustomGroups] = useState<EmployeeGroup[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', premium: 0 });
  const [masters, setMasters] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMaster, setAssignMaster] = useState('');
  const [assignGroup, setAssignGroup] = useState('');

  useEffect(() => {
    fetchSettings();
    supabase.from('business_masters')
      .select('master_id, profile:profiles!business_masters_master_id_fkey(first_name, last_name)')
      .eq('business_id', businessId).eq('status', 'accepted')
      .then(({ data }) => {
        setMasters((data || []).map((m: any) => ({
          id: m.master_id,
          name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Без имени',
        })));
      });
  }, [businessId]);

  const fetchSettings = async () => {
    try {
      const data = await fetchBusinessSettingsSections(businessId);
      const erp = (data?.erp as any) || {};
      setCustomGroups((erp.employee_groups as EmployeeGroup[]) || []);
      setAssignments((erp.employee_group_assignments as Record<string, string>) || {});
    } catch (error: any) {
      toast({ title: 'Не удалось загрузить группы сотрудников', description: error.message, variant: 'destructive' });
    }
  };

  const allGroups = [...systemGroups, ...customGroups];

  const saveCustom = async (updated: EmployeeGroup[]) => {
    setCustomGroups(updated);
    const existing = await fetchBusinessSettingsSections(businessId);
    const erp = {
      ...((existing?.erp as any) || {}),
      employee_groups: updated,
      employee_group_assignments: assignments,
    };
    await updateBusinessSettingsSection(businessId, 'erp', erp);
  };

  const saveAssignments = async (updated: Record<string, string>) => {
    setAssignments(updated);
    const existing = await fetchBusinessSettingsSections(businessId);
    const erp = {
      ...((existing?.erp as any) || {}),
      employee_groups: customGroups,
      employee_group_assignments: updated,
    };
    await updateBusinessSettingsSection(businessId, 'erp', erp);
  };

  const addGroup = async () => {
    if (!form.name.trim()) return;
    const g: EmployeeGroup = { id: crypto.randomUUID(), name: form.name, premium: form.premium, isSystem: false };
    try {
      await saveCustom([...customGroups, g]);
    } catch (error: any) {
      toast({ title: 'Не удалось добавить группу', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Группа добавлена' });
    setDialogOpen(false);
    setForm({ name: '', premium: 0 });
  };

  const removeGroup = async (id: string) => {
    try {
      const nextGroups = customGroups.filter(g => g.id !== id);
      const nextAssignments = Object.fromEntries(
        Object.entries(assignments).filter(([, groupId]) => groupId !== id)
      );
      setAssignments(nextAssignments);
      await saveCustom(nextGroups);
      await saveAssignments(nextAssignments);
      toast({ title: 'Группа удалена' });
    } catch (error: any) {
      toast({ title: 'Не удалось удалить группу', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssign = async () => {
    if (!assignMaster || !assignGroup) return;
    const updated = { ...assignments, [assignMaster]: assignGroup };
    try {
      await saveAssignments(updated);
    } catch (error: any) {
      toast({ title: 'Не удалось сохранить назначение', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Мастер назначен в группу' });
    setAssignOpen(false);
  };

  const getGroupName = (groupId: string) => allGroups.find(g => g.id === groupId)?.name || '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6" /> Группы сотрудников</h2>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Добавить</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allGroups.map(g => (
          <Card key={g.id}>
            <CardContent className="py-4 px-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{g.name}</p>
                <p className="text-xs text-muted-foreground">Премия: +{g.premium}%</p>
              </div>
              <div className="flex items-center gap-2">
                {g.isSystem && <Badge variant="secondary" className="text-xs">Системная</Badge>}
                {!g.isSystem && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeGroup(g.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Master assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Назначения мастеров</CardTitle>
          <CardDescription>Привяжите мастеров к группам для расчёта премий</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Назначить
          </Button>
          {masters.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет принятых мастеров</p>
          ) : (
            <div className="space-y-2">
              {masters.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{m.name}</span>
                  <Badge variant="outline">{getGroupName(assignments[m.id] || '')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая группа</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Название *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Премия (%)</Label><Input type="number" value={form.premium} onChange={e => setForm(p => ({ ...p, premium: Number(e.target.value) }))} /></div>
            <Button className="w-full" onClick={addGroup}>Создать</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Назначить в группу</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Мастер</Label>
              <Select value={assignMaster} onValueChange={setAssignMaster}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>{masters.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Группа</Label>
              <Select value={assignGroup} onValueChange={setAssignGroup}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>{allGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name} (+{g.premium}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleAssign}>Назначить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessEmployeeGroups;
