import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import {
  Users,
  Package,
  DollarSign,
  ClipboardCheck,
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
import { DashboardCard } from './DashboardCard';

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
          <DashboardCard
            title="Employee Action"
            description="Log staff incidents, kudos, or attendance notes for your team."
            icon={Users}
            onClick={() => setActiveModule('employee')}
            headerColor="bg-metro-blue"
            iconColor="text-metro-blue"
            badges={[
              { label: 'Incidents', className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' },
              { label: 'Kudos', className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' },
              { label: 'Attendance', className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' }
            ]}
          />
        )}

        {selectedStore && (
          <DashboardCard
            title="Inventory Action"
            description="Conduct stock audits and report inventory problems including damaged or missing items."
            icon={Package}
            onClick={() => setActiveModule('inventory')}
            headerColor="bg-metro-yellow"
            iconColor="text-metro-yellow"
            titleColor="text-brutal-black"
            badges={[
              { label: 'Stock Audit', className: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' },
              { label: 'Problems', className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' }
            ]}
          />
        )}

        {selectedStore && (
          <DashboardCard
            title="Cash Action"
            description="Reconcile cash drawers and report shortages with automatic severity classification."
            icon={DollarSign}
            onClick={() => setActiveModule('cash')}
            headerColor="bg-metro-magenta"
            iconColor="text-metro-magenta"
            highPriority={true}
            badges={[
              { label: 'Reconciliation', className: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200' },
              { label: 'Shortage Alert', className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' }
            ]}
          />
        )}

        {selectedStore && (
          <DashboardCard
            title="Store Action"
            description="Complete opening/closing checklists and submit maintenance requests."
            icon={ClipboardCheck}
            onClick={() => setActiveModule('store')}
            headerColor="bg-metro-green"
            iconColor="text-metro-green"
            badges={[
              { label: 'Open/Close', className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' },
              { label: 'Maintenance', className: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' }
            ]}
          />
        )}

        {selectedStore && (
          <DashboardCard
            title={isRSM || isAdmin ? 'Employee Reports' : 'My Documents'}
            description={isRSM || isAdmin
              ? 'Create CAPA reports, warnings, and recognition documents.'
              : 'View and acknowledge documents assigned to you.'}
            icon={FileText}
            onClick={() => setActiveModule('reports')}
            headerColor="bg-teal-600"
            iconColor="text-teal-600"
            badges={[
              { label: 'CAPA', className: 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200' },
              { label: 'Warnings', className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
              { label: 'Recognition', className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' }
            ]}
          />
        )}

        {isAdmin && (
          <DashboardCard
            title="Admin Panel"
            description="Manage users, roles, submission types, and oversee all system activity."
            icon={Settings}
            onClick={() => setActiveModule('admin')}
            headerColor="bg-red-600"
            iconColor="text-red-600"
            badges={[
              { label: 'Users', className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' },
              { label: 'Roles', className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' },
              { label: 'Submissions', className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' }
            ]}
          />
        )}
      </div>
    </div>
  );
}
