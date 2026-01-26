import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { languages } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'full';
  className?: string;
}

const LanguageSwitcher = ({ variant = 'icon', className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'full' ? (
          <Button variant="outline" size="sm" className={`gap-2 ${className}`}>
            <span className="text-base">{currentLanguage.flag}</span>
            <span className="text-sm">{currentLanguage.name}</span>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className={className}>
            <Globe className="h-5 w-5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer gap-3 ${
              i18n.language === language.code ? 'bg-muted' : ''
            }`}
          >
            <span className="text-base">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
