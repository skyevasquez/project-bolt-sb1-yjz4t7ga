import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  Users,
  Package,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  FileText,
  Settings,
  Store as StoreIcon
} from 'lucide-react';
import { EmployeeActionModule } from './modules/EmployeeActionModule';
import { InventoryActionModule } from './modules/InventoryActionModule';
import { CashActionModule } from './modules/CashActionModule';
import { StoreActionModule } from './modules/StoreActionModule';
import { EmployeeReportsModule } from './modules/EmployeeReportsModule';
import { AdminPanel } from './admin/AdminPanel';

type ModuleType = 'employee' | 'inventory' | 'cash' | 'store' | 'reports' | 'admin' | null;

export function Dashboard() {
  const { isRSM, isAdmin } = useAuth();
  const { selectedStore, stores, selectStore } = useStore();
  const [activeModule, setActiveModule] = useState<ModuleType>(null);
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  if (activeModule === 'admin') {
    return <AdminPanel onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'employee') {
    return <EmployeeActionModule onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'inventory') {
    return <InventoryActionModule onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'cash') {
    return <CashActionModule onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'store') {
    return <StoreActionModule onBack={() => setActiveModule(null)} />;
  }

  if (activeModule === 'reports') {
    return <EmployeeReportsModule onBack={() => setActiveModule(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
        {selectedStore ? (
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {selectedStore.name} - {selectedStore.store_number}
          </p>
        ) : isAdmin ? (
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            System Administration - No store selected
          </p>
        ) : null}
      </div>

      {!selectedStore && isAdmin ? (
        <div className="card-brutal p-8 mb-6">
          <div className="text-center mb-6">
            <p className="font-bold text-lg mb-2">Welcome to Admin Dashboard</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Select a store to perform store-specific actions, or use the Admin Panel to manage the system.
            </p>
            <button
              onClick={() => setShowStoreSelector(!showStoreSelector)}
              className="btn-brutal-primary py-2 px-6 inline-flex items-center gap-2"
            >
              <StoreIcon className="w-4 h-4" />
              {showStoreSelector ? 'Hide Stores' : 'Select a Store'}
            </button>
          </div>

          {showStoreSelector && (
            <div className="border-t-3 border-brutal-black dark:border-brutal-dark-border pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      selectStore(store);
                      setShowStoreSelector(false);
                    }}
                    className="p-4 border-3 border-brutal-black dark:border-brutal-dark-border bg-brutal-white dark:bg-brutal-dark-surface hover:bg-metro-yellow dark:hover:bg-metro-yellow dark:hover:text-brutal-black transition-colors text-left"
                  >
                    <p className="font-bold">{store.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{store.store_number}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedStore && (isRSM || isAdmin) && (
          <button
            onClick={() => setActiveModule('employee')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group"
          >
            <div className="bg-metro-blue p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                  <Users className="w-8 h-8 text-metro-blue" />
                </div>
                <ArrowRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">Employee Action</h2>
            </div>
            <div className="p-6">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
                Log staff incidents, kudos, or attendance notes for your team.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-brutal bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Incidents</span>
                <span className="badge-brutal bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Kudos</span>
                <span className="badge-brutal bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Attendance</span>
              </div>
            </div>
          </button>
        )}

        {selectedStore && (
          <button
            onClick={() => setActiveModule('inventory')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group"
          >
          <div className="bg-metro-yellow p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                <Package className="w-8 h-8 text-metro-yellow" />
              </div>
              <ArrowRight className="w-6 h-6 text-brutal-black opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h2 className="text-2xl font-bold text-brutal-black mt-4">Inventory Action</h2>
          </div>
          <div className="p-6">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
              Conduct stock audits and report inventory problems including damaged or missing items.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-brutal bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Stock Audit</span>
              <span className="badge-brutal bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Problems</span>
            </div>
          </div>
        </button>
        )}

        {selectedStore && (
          <button
            onClick={() => setActiveModule('cash')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group relative"
          >
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500 border-2 border-brutal-black dark:border-brutal-dark-border text-white text-xs font-bold">
              <AlertTriangle className="w-3 h-3" />
              HIGH PRIORITY
            </div>
          </div>
          <div className="bg-metro-magenta p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-metro-magenta" />
              </div>
              <ArrowRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">Cash Action</h2>
          </div>
          <div className="p-6">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
              Reconcile cash drawers and report shortages with automatic severity classification.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-brutal bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200">Reconciliation</span>
              <span className="badge-brutal bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Shortage Alert</span>
            </div>
          </div>
        </button>
        )}

        {selectedStore && (
          <button
            onClick={() => setActiveModule('store')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group"
          >
          <div className="bg-metro-green p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                <ClipboardCheck className="w-8 h-8 text-metro-green" />
              </div>
              <ArrowRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">Store Action</h2>
          </div>
          <div className="p-6">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
              Complete opening/closing checklists and submit maintenance requests.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-brutal bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Open/Close</span>
              <span className="badge-brutal bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">Maintenance</span>
            </div>
          </div>
        </button>
        )}

        {selectedStore && (
          <button
            onClick={() => setActiveModule('reports')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group"
          >
          <div className="bg-teal-600 p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                <FileText className="w-8 h-8 text-teal-600" />
              </div>
              <ArrowRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-4">
              {isRSM || isAdmin ? 'Employee Reports' : 'My Documents'}
            </h2>
          </div>
          <div className="p-6">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
              {isRSM || isAdmin
                ? 'Create CAPA reports, warnings, and recognition documents.'
                : 'View and acknowledge documents assigned to you.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge-brutal bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">CAPA</span>
              <span className="badge-brutal bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Warnings</span>
              <span className="badge-brutal bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Recognition</span>
            </div>
          </div>
        </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveModule('admin')}
            className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group"
          >
            <div className="bg-red-600 p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border">
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
                  <Settings className="w-8 h-8 text-red-600" />
                </div>
                <ArrowRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">Admin Panel</h2>
            </div>
            <div className="p-6">
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
                Manage users, roles, submission types, and oversee all system activity.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-brutal bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Users</span>
                <span className="badge-brutal bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Roles</span>
                <span className="badge-brutal bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Submissions</span>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
