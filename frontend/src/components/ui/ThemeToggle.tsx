import { Button } from '@/components/ui/button';
import { SunIcon, MoonIcon } from '@/components/ui/icons';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 h-10 px-3 sm:px-4 bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
      aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
      aria-pressed={isDark}
      title={isDark ? 'Tema escuro ativo' : 'Tema claro ativo'}
    >
      {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
      {isDark ? 'Light' : 'Dark'}
    </Button>
  );
}
