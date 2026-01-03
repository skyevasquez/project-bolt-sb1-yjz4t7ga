import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Store } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface StoreContextType {
  stores: Store[];
  selectedStore: Store | null;
  selectStore: (store: Store) => void;
  clearStore: () => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SELECTED_STORE_KEY = 'compliance_hub_selected_store';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    const fetchStores = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from('stores').select('*').order('name');
      if (data) {
        setStores(data);
      }
      setLoading(false);
    };

    fetchStores();

    const savedStore = localStorage.getItem(SELECTED_STORE_KEY);
    if (savedStore) {
      try {
        setSelectedStore(JSON.parse(savedStore));
      } catch {
        localStorage.removeItem(SELECTED_STORE_KEY);
      }
    }
  }, [session]);

  const selectStore = (store: Store) => {
    setSelectedStore(store);
    localStorage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
  };

  const clearStore = () => {
    setSelectedStore(null);
    localStorage.removeItem(SELECTED_STORE_KEY);
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        selectStore,
        clearStore,
        loading
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
