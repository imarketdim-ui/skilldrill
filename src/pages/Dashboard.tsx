import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Building2, 
  Calendar, 
  Star, 
  Settings, 
  LogOut, 
  Sparkles,
  Plus,
  Users,
  ClipboardList,
  BarChart3,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  is_active: boolean;
  role_name?: string;
}

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    if (!user) return;

    try {
      // Fetch organizations where user is a member
      const { data: orgUsers, error } = await supabase
        .from('organization_users')
        .select(`
          organization_id,
          role_id,
          organizations!inner(id, name, is_active),
          roles!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const orgs: Organization[] = (orgUsers || []).map((ou: any) => ({
        id: ou.organizations.id,
        name: ou.organizations.name,
        is_active: ou.organizations.is_active,
        role_name: ou.roles.name,
      }));

      // Also check if user owns any organizations
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('owner_id', user.id);

      if (!ownedError && ownedOrgs) {
        ownedOrgs.forEach((org) => {
          if (!orgs.find(o => o.id === org.id)) {
            orgs.push({ ...org, role_name: 'Владелец' });
          }
        });
      }

      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleCopyId = () => {
    if (profile?.skillspot_id) {
      navigator.clipboard.writeText(profile.skillspot_id);
      setCopied(true);
      toast({
        title: 'ID скопирован',
        description: 'Ваш SkillSpot ID скопирован в буфер обмена',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-wide py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const isPlatformAdmin = profile?.platform_role === 'platform_admin';
  const hasOrganizations = organizations.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container-wide py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SkillSpot</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container-wide py-8">
        {/* Profile Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profile?.first_name?.[0] || profile?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.first_name && profile?.last_name 
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile?.email || 'Пользователь'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-sm">
                  ID: {profile?.skillspot_id}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyId}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                {isPlatformAdmin && (
                  <Badge className="bg-amber-500 text-white">
                    <Shield className="h-3 w-3 mr-1" />
                    Администратор
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              Мои записи
            </TabsTrigger>
            {hasOrganizations && (
              <TabsTrigger value="organizations" className="gap-2">
                <Building2 className="h-4 w-4" />
                Организации
              </TabsTrigger>
            )}
            {isPlatformAdmin && (
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Администрирование
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Личные данные</CardTitle>
                  <CardDescription>Ваша контактная информация</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Телефон</p>
                    <p className="font-medium">{profile?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">О себе</p>
                    <p className="font-medium">{profile?.bio || '—'}</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Редактировать профиль
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Рейтинг</CardTitle>
                  <CardDescription>Ваша репутация на платформе</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                      <span className="text-3xl font-bold">—</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Нет оценок</p>
                      <p>0 отзывов</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Быстрые действия</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/')}>
                      <Calendar className="h-6 w-6 text-primary" />
                      <span>Найти услугу</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/create-organization')}>
                      <Plus className="h-6 w-6 text-primary" />
                      <span>Создать организацию</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/settings')}>
                      <Settings className="h-6 w-6 text-primary" />
                      <span>Настройки</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Мои записи</CardTitle>
                <CardDescription>История ваших записей на услуги</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>У вас пока нет записей</p>
                  <Button className="mt-4" onClick={() => navigate('/')}>
                    Найти услугу
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          {hasOrganizations && (
            <TabsContent value="organizations">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loadingOrgs ? (
                  <>
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                  </>
                ) : (
                  organizations.map((org) => (
                    <Card key={org.id} className="card-hover cursor-pointer" onClick={() => navigate(`/organization/${org.id}`)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <Badge variant="secondary" className="mt-2">
                              {org.role_name}
                            </Badge>
                          </div>
                          <Building2 className="h-8 w-8 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">
                          Перейти в панель
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
                
                <Card className="border-dashed card-hover cursor-pointer" onClick={() => navigate('/create-organization')}>
                  <CardContent className="flex flex-col items-center justify-center h-full py-12">
                    <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium">Создать организацию</p>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      Подайте заявку на создание
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Admin Tab */}
          {isPlatformAdmin && (
            <TabsContent value="admin">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="card-hover cursor-pointer" onClick={() => navigate('/admin/users')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Пользователи</p>
                        <p className="text-sm text-muted-foreground">Управление аккаунтами</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover cursor-pointer" onClick={() => navigate('/admin/organizations')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Организации</p>
                        <p className="text-sm text-muted-foreground">Все организации</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover cursor-pointer" onClick={() => navigate('/admin/requests')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-accent/10">
                        <ClipboardList className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="font-semibold">Заявки</p>
                        <p className="text-sm text-muted-foreground">На создание организаций</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-hover cursor-pointer" onClick={() => navigate('/admin/services')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <BarChart3 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Услуги</p>
                        <p className="text-sm text-muted-foreground">Модерация услуг</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
