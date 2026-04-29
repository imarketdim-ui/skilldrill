import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface KYCFormProps {
  kycVerified?: boolean;
  onVerified?: () => void;
}

const KYCForm = ({ kycVerified = false }: KYCFormProps) => {
  if (kycVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Верификация пройдена
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Документы подтверждены
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-primary" />
          KYC в разработке
        </CardTitle>
        <CardDescription>
          Полноценная верификация документов скоро будет добавлена. Пока этот сценарий недоступен в интерфейсе.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Скоро будет добавлен
        </Badge>
        <p className="text-sm text-muted-foreground">
          Когда KYC будет готов, здесь появится загрузка документов, статус проверки и история верификации.
        </p>
      </CardContent>
    </Card>
  );
};

export default KYCForm;
