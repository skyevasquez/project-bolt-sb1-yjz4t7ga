import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Store as StoreIcon, MapPin, ChevronRight, Search } from 'lucide-react';

export function StoreSelector() {
  const { stores, selectStore, loading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.store_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedStores = filteredStores.reduce(
    (acc, store) => {
      if (!acc[store.region]) {
        acc[store.region] = [];
      }
      acc[store.region].push(store);
      return acc;
    },
    {} as Record<string, typeof stores>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-brutal-cream dark:bg-brutal-dark-bg flex items-center justify-center">
        <div className="card-brutal p-12 text-center">
          <div className="w-12 h-12 border-4 border-metro-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brutal-cream dark:bg-brutal-dark-bg p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="card-brutal mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-metro-blue border-3 border-brutal-black dark:border-brutal-dark-border flex items-center justify-center">
              <StoreIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Select Your Store</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Choose your location to continue</p>
            </div>
          </div>
        </div>

        <div className="card-brutal mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-brutal pl-12"
              placeholder="Search by store name, number, or region..."
            />
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedStores).map(([region, regionStores]) => (
            <div key={region}>
              <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 px-1">
                {region}
              </h2>
              <div className="space-y-3">
                {regionStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => selectStore(store)}
                    className="w-full card-brutal p-4 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-metro-yellow border-3 border-brutal-black dark:border-brutal-dark-border flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-brutal-black" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{store.name}</span>
                        <span className="badge-brutal bg-brutal-gray dark:bg-brutal-dark-bg text-xs">
                          {store.store_number}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                        {store.address}
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredStores.length === 0 && (
            <div className="card-brutal p-8 text-center">
              <p className="font-bold text-gray-600 dark:text-gray-400">No stores found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
