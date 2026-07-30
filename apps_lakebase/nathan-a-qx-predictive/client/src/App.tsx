import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useState, useEffect } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  TooltipProvider,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { Menu, Plane, Search, Settings, Package, BarChart3, AlertTriangle } from 'lucide-react';
import HomePage from './pages/HomePage';
import DefectsPage from './pages/DefectsPage';
import PartsPage from './pages/PartsPage';
import EnginesPage from './pages/EnginesPage';
import SparesPage from './pages/SparesPage';
import ReliabilityPage from './pages/ReliabilityPage';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: BarChart3, end: true },
  { to: '/defects', label: 'Defects', icon: AlertTriangle, end: false },
  { to: '/parts', label: 'Parts', icon: Search, end: false },
  { to: '/engines', label: 'Engines', icon: Settings, end: false },
  { to: '/spares', label: 'Spares', icon: Package, end: false },
  { to: '/reliability', label: 'Reliability', icon: BarChart3, end: false },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({ className, linkClass, onClick }: { className?: string; linkClass: NavLinkClassFn; onClick?: () => void }) {
  return (
    <nav className={className}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onClick}>
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav when viewport crosses to desktop
  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 md:px-6 py-3 flex items-center gap-4 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          <h1 className="text-lg font-semibold" data-testid="app-title">QX Propulsion</h1>
        </div>
        {/* Desktop nav — hidden below md breakpoint */}
        <NavLinks className="hidden md:flex gap-1" linkClass={navLinkClass} />
        {/* Mobile nav — visible below md breakpoint */}
        <div className="ml-auto md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} className="text-primary-foreground hover:bg-primary/80">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <NavLinks className="flex flex-col gap-1" linkClass={mobileNavLinkClass} onClick={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden md:block ml-auto text-xs opacity-70">
          Horizon Air — E175 / CF34-8E
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>

      <footer className="border-t px-4 md:px-6 py-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>QX Predictive Maintenance — Domain 1: Propulsion Parts & Defects Intelligence</span>
        <span>Alaska Air Group</span>
      </footer>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/defects', element: <DefectsPage /> },
      { path: '/parts', element: <PartsPage /> },
      { path: '/engines', element: <EnginesPage /> },
      { path: '/spares', element: <SparesPage /> },
      { path: '/reliability', element: <ReliabilityPage /> },
    ],
  },
]);

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  );
}
