import { Link, useLocation } from 'react-router-dom';
import { Bitcoin, Home, PlusCircle, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Polls', icon: Home },
    { to: '/create', label: 'Create', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight transition-colors hover:text-primary"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bitcoin className="size-5" />
            </div>
            <span className="hidden sm:inline">BitVote</span>
          </Link>

          {/* Center nav */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Button
                  key={to}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  asChild
                  className={cn(isActive && 'bg-secondary font-semibold')}
                >
                  <Link to={to}>
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="size-8"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <LoginArea className="max-w-48" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p>
            Bitcoin-backed polls on Nostr.{' '}
            <a
              href="https://shakespeare.diy"
              className="underline underline-offset-4 transition-colors hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vibed with Shakespeare
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
