import { type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useTheme } from '../context/ThemeContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import {
  Shield,
  LogOut,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isRSM, isAdmin } = useAuth();
  const { selectedStore, clearStore } = useStore();
  const { isOnline, pendingCount, isSyncing, syncQueue } = useOfflineSync();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isRSM) return 'Store Manager';
    return 'Store Employee';
  };

  return (
    <div className="min-h-screen bg-brutal-cream dark:bg-brutal-dark-bg flex flex-col">
      <header className="bg-brutal-white dark:bg-brutal-dark-surface border-b-4 border-brutal-black dark:border-brutal-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-metro-purple border-3 border-brutal-black flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg leading-tight">Compliance Hub</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Metro by T-Mobile</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <div className="flex items-center gap-1 text-metro-green">
                    <Wifi className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-bold">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-metro-orange">
                    <WifiOff className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-bold">Offline</span>
                  </div>
                )}

                {pendingCount > 0 && (
                  <button
                    onClick={syncQueue}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center gap-1 px-2 py-1 bg-metro-yellow border-2 border-brutal-black dark:border-brutal-dark-border text-xs font-bold text-brutal-black"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {pendingCount}
                  </button>
                )}

                <button
                  onClick={toggleTheme}
                  className="p-2 border-2 border-brutal-black dark:border-brutal-dark-border bg-brutal-white dark:bg-brutal-dark-bg hover:bg-gray-100 dark:hover:bg-brutal-dark-surface transition-colors"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 border-2 border-brutal-black dark:border-brutal-dark-border"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="hidden md:flex items-center gap-3">
                {selectedStore ? (
                  <button
                    onClick={clearStore}
                    className="flex items-center gap-2 px-3 py-2 bg-brutal-gray dark:bg-brutal-dark-bg border-2 border-brutal-black dark:border-brutal-dark-border text-sm font-bold hover:bg-metro-yellow dark:hover:bg-metro-yellow dark:hover:text-brutal-black transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="max-w-32 truncate">{selectedStore.name}</span>
                  </button>
                ) : isAdmin ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900 border-2 border-brutal-black dark:border-brutal-dark-border text-sm font-bold dark:text-white">
                    <MapPin className="w-4 h-4" />
                    <span>All Stores</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {getRoleLabel()}
                    </p>
                  </div>
                  <button
                    onClick={signOut}
                    className="p-2 border-2 border-brutal-black dark:border-brutal-dark-border hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t-3 border-brutal-black dark:border-brutal-dark-border bg-brutal-white dark:bg-brutal-dark-surface p-4 space-y-3">
            {selectedStore ? (
              <button
                onClick={() => {
                  clearStore();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-brutal-gray dark:bg-brutal-dark-bg border-2 border-brutal-black dark:border-brutal-dark-border text-sm font-bold"
              >
                <MapPin className="w-4 h-4" />
                <span className="truncate">{selectedStore.name}</span>
                <span className="ml-auto text-xs">(Change)</span>
              </button>
            ) : isAdmin ? (
              <div className="w-full flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900 border-2 border-brutal-black dark:border-brutal-dark-border text-sm font-bold dark:text-white">
                <MapPin className="w-4 h-4" />
                <span>All Stores</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between p-3 bg-brutal-cream dark:bg-brutal-dark-bg border-2 border-brutal-black dark:border-brutal-dark-border">
              <div>
                <p className="font-bold">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {getRoleLabel()}
                </p>
              </div>
              <button
                onClick={signOut}
                className="btn-brutal-danger py-2 px-4 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-brutal-white dark:bg-brutal-dark-surface border-t-4 border-brutal-black dark:border-brutal-dark-border py-4 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <p>Compliance Hub v1.0</p>
          <p>Metro by T-Mobile Retail Management</p>
        </div>
      </footer>
    </div>
  );
}
