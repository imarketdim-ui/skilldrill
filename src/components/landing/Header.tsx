import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  { label: "Каталог", href: "/catalog", isRoute: true },
  { label: "Лендинг", href: "/landing", isRoute: true },
  { label: "О платформе", href: "/about", isRoute: true },
  { label: "Для бизнеса", href: "/for-business", isRoute: true },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16 md:h-20">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Link to="/catalog" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="font-display font-bold text-xl text-foreground">SkillSpot</span>
            </Link>
          </motion.div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link, index) => (
              <motion.div key={link.href} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <Link to={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard')}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile?.first_name?.[0] || profile?.email?.[0] || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">Личный кабинет</span>
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Войти</Button>
                <Button variant="hero" onClick={() => navigate('/auth?tab=signup')}>Начать бесплатно</Button>
              </>
            )}
          </motion.div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-foreground">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden border-t border-border/50 bg-background">
          <div className="container-wide py-4 space-y-4">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)} className="block text-foreground font-medium py-2">
                {link.label}
              </Link>
            ))}
            <div className="pt-4 space-y-3">
              {user ? (
                <Button variant="hero" className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/dashboard'); }}>
                  Личный кабинет
                </Button>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/auth'); }}>Войти</Button>
                  <Button variant="hero" className="w-full" onClick={() => { setIsMenuOpen(false); navigate('/auth?tab=signup'); }}>Начать бесплатно</Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
