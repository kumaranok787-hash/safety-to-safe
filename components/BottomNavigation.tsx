import { NavLink } from 'react-router-dom';
import { Home, HeartPulse, BookOpen, Shield, ShieldAlert, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';

const navItems = [
  { path: '/', icon: Home, labelKey: 'home' },
  { path: '/health', icon: HeartPulse, labelKey: 'health' },
  { path: '/education', icon: BookOpen, labelKey: 'education' },
  { path: '/women-safety', icon: Shield, labelKey: 'safety' },
  { path: '/police', icon: ShieldAlert, labelKey: 'police' },
];

export default function BottomNavigation({ onSOSClick, currentPath, isDesktop }: { onSOSClick: () => void, currentPath: string, isDesktop?: boolean }) {
  const { t } = useLanguage();

  if (isDesktop) {
    return (
      <div className="flex items-center gap-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'px-6 py-3 rounded-2xl text-base font-bold transition-all flex items-center gap-3 relative group',
                isActive ? 'text-red-700' : 'text-gray-500 hover:text-gray-900'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {t(item.labelKey)}
            {/* Active Indicator Line */}
            <div className={clsx(
              "absolute bottom-0 left-6 right-6 h-1 bg-red-600 rounded-full transition-all",
              currentPath === item.path ? "opacity-100" : "opacity-0 group-hover:opacity-40"
            )} />
          </NavLink>
        ))}
        <button
          onClick={onSOSClick}
          className="ml-8 bg-red-600 text-white px-10 py-4 rounded-2xl font-display font-black text-base shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5" />
          SOS EMERGENCY
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 px-2 z-40">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          aria-label={`Navigate to ${t(item.labelKey)}`}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center w-full h-full space-y-1',
              isActive ? 'text-red-700' : 'text-gray-600 hover:text-red-600'
            )
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
        </NavLink>
      ))}

      {/* Global SOS Button (hidden on Home page since it has a big one) */}
      {currentPath !== '/' && (
        <button
          onClick={onSOSClick}
          aria-label="Activate SOS Alert"
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white rounded-full p-3 shadow-lg shadow-red-200 border-4 border-white active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <AlertTriangle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
