import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Home, Search } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <MapPin className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <h2 className="mb-3 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mb-6 text-muted-foreground">
          К сожалению, запрашиваемая страница не существует. Возможно, она была удалена или вы перешли по неверной ссылке.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button>
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Button>
          </Link>
          <Link to="/catalog">
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Каталог
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
