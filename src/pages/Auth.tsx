import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowLeft, Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Введите корректный email').max(255, 'Email слишком длинный');
const passwordSchema = z.string().min(6, 'Минимум 6 символов').max(72, 'Пароль слишком длинный');
const nameSchema = z.string().trim().max(100, 'Имя слишком длинное').optional();

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateForm = (isSignUp: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (e) { if (e instanceof z.ZodError) newErrors.email = e.errors[0].message; }
    if (!resetMode) {
      try { passwordSchema.parse(password); } catch (e) { if (e instanceof z.ZodError) newErrors.password = e.errors[0].message; }
    }
    if (isSignUp) {
      try { nameSchema.parse(firstName); } catch (e) { if (e instanceof z.ZodError) newErrors.firstName = e.errors[0].message; }
      try { nameSchema.parse(lastName); } catch (e) { if (e instanceof z.ZodError) newErrors.lastName = e.errors[0].message; }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (err) { if (err instanceof z.ZodError) newErrors.email = err.errors[0].message; }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://skilldrill.lovable.app/auth',
    });
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      setResetSent(true);
      toast({ title: 'Письмо отправлено', description: 'Проверьте почту для сброса пароля' });
    }
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      toast({
        title: 'Ошибка входа',
        description: error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    setIsLoading(true);
    const { error } = await signUp(email.trim(), password, firstName.trim(), lastName.trim());
    if (error) {
      toast({ title: 'Ошибка регистрации', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Регистрация успешна!', description: 'Проверьте почту для подтверждения аккаунта' });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> На главную
          </Button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">SkillSpot</span>
          </div>
          <p className="text-muted-foreground">Маркетплейс услуг для вашего бизнеса</p>
        </div>

        <Card>
          {resetMode ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl">Сброс пароля</CardTitle>
                <CardDescription>Введите email для получения ссылки на сброс пароля</CardDescription>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="text-center py-4 space-y-4">
                    <Mail className="h-12 w-12 mx-auto text-primary" />
                    <p className="text-muted-foreground">Письмо со ссылкой для сброса пароля отправлено на <strong>{email}</strong></p>
                    <Button variant="outline" onClick={() => { setResetMode(false); setResetSent(false); }}>Вернуться ко входу</Button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="reset-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`pl-10 ${errors.email ? 'border-destructive' : ''}`} disabled={isLoading} />
                      </div>
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Отправка...</> : 'Отправить ссылку'}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setResetMode(false)}>Вернуться ко входу</Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Вход</TabsTrigger>
                    <TabsTrigger value="signup">Регистрация</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin" className="mt-6">
                    <CardTitle className="text-xl">Войти в аккаунт</CardTitle>
                    <CardDescription>Введите email и пароль для входа</CardDescription>
                  </TabsContent>
                  <TabsContent value="signup" className="mt-6">
                    <CardTitle className="text-xl">Создать аккаунт</CardTitle>
                    <CardDescription>Заполните данные для регистрации</CardDescription>
                  </TabsContent>
                </Tabs>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`pl-10 ${errors.email ? 'border-destructive' : ''}`} disabled={isLoading} />
                        </div>
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Пароль</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`} disabled={isLoading} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>
                      <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                        {isLoading ? 'Вход...' : 'Войти'}
                      </Button>
                      <Button type="button" variant="link" className="w-full text-sm" onClick={() => setResetMode(true)}>
                        Забыли пароль?
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Имя</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="firstName" type="text" placeholder="Иван" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`pl-10 ${errors.firstName ? 'border-destructive' : ''}`} disabled={isLoading} />
                          </div>
                          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Фамилия</Label>
                          <Input id="lastName" type="text" placeholder="Иванов" value={lastName} onChange={(e) => setLastName(e.target.value)} className={errors.lastName ? 'border-destructive' : ''} disabled={isLoading} />
                          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`pl-10 ${errors.email ? 'border-destructive' : ''}`} disabled={isLoading} />
                        </div>
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Пароль</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Минимум 6 символов" value={password} onChange={(e) => setPassword(e.target.value)} className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`} disabled={isLoading} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>
                      <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                        {isLoading ? 'Регистрация...' : 'Создать аккаунт'}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Регистрируясь, вы соглашаетесь с{' '}
                        <a href="/terms" target="_blank" className="text-primary hover:underline">условиями использования</a>{' '}и{' '}
                        <a href="/privacy" target="_blank" className="text-primary hover:underline">политикой конфиденциальности</a>
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
