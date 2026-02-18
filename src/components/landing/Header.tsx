import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  { label: "Каталог", href: "/catalog" },
  { label: "О платформе", href: "/about" },
  { label: "Для бизнеса", href: "/for-business" },
  { label: "Тарифы", href: "/subscription" },
  { label: "Контакты", href: "/contacts" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-none border-b border-border">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg font-display">S</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground">SkillSpot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard')}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.first_name?.[0] || profile?.email?.[0] || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">Личный кабинет</span>
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Войти</Button>
                <Button onClick={() => navigate('/auth?tab=signup')}>Начать бесплатно</Button>
              </>
            )}
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-foreground">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container-wide py-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)} className="block text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-secondary">
                {link.label}
              </Link>
            ))}
            <div className="pt-4 space-y-3 border-t border-border">
              {user ? (
                <Button className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/dashboard'); }}>
                  Личный кабинет
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/auth'); }}>Войти</Button>
                  <Button className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/auth?tab=signup'); }}>Начать бесплатно</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
