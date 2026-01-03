import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './components/LoginPage';
import { StoreSelector } from './components/StoreSelector';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { initOfflineDb } from './lib/offlineDb';

function AppContent() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { selectedStore, loading: storeLoading } = useStore();

  useEffect(() => {
    initOfflineDb();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (authLoading || storeLoading) {
    return (
      <div className="min-h-screen bg-brutal-cream dark:bg-brutal-dark-bg flex items-center justify-center">
        <div className="card-brutal p-12 text-center">
          <div className="w-12 h-12 border-4 border-metro-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!selectedStore && !isAdmin) {
    return <StoreSelector />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StoreProvider>
          <AppContent />
        </StoreProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
