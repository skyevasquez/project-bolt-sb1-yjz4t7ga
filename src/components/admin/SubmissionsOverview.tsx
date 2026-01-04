import { useState, useEffect } from 'react';
import { supabase, type Store, type Profile } from '../../lib/supabase';
import {
  Search,
  Calendar,
  ChevronDown,
  Loader2,
  Users,
  Package,
  DollarSign,
  ClipboardCheck,
  FileText,
  Eye,
  X,
  MapPin,
  User,
  Clock
} from 'lucide-react';

type ModuleType = 'employee_actions' | 'inventory_actions' | 'cash_actions' | 'store_actions' | 'employee_reports';

interface Submission {
  id: string;
  module: ModuleType;
  store_id: string;
  submitted_by: string;
  created_at: string;
  type?: string;
  severity?: string;
  description?: string;
  status?: string;
  store?: Store;
  submitter?: Profile;
}

const MODULE_CONFIG: Record<ModuleType, { label: string; icon: typeof Users; color: string; table: string }> = {
  employee_actions: { label: 'Employee Actions', icon: Users, color: 'bg-blue-500', table: 'employee_actions' },
  inventory_actions: { label: 'Inventory Actions', icon: Package, color: 'bg-yellow-500', table: 'inventory_actions' },
  cash_actions: { label: 'Cash Actions', icon: DollarSign, color: 'bg-pink-500', table: 'cash_actions' },
  store_actions: { label: 'Store Actions', icon: ClipboardCheck, color: 'bg-green-500', table: 'store_actions' },
  employee_reports: { label: 'Employee Reports', icon: FileText, color: 'bg-teal-500', table: 'employee_reports' }
};

export function SubmissionsOverview() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<ModuleType | 'all'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: storesData } = await supabase.from('stores').select('*');
      setStores(storesData || []);

      const { data: profilesData } = await supabase.from('profiles').select('*');
      const profilesMap: Record<string, Profile> = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = p;
      });
      setProfiles(profilesMap);

      const allSubmissions: Submission[] = [];
      const modulesToFetch = moduleFilter === 'all'
        ? Object.keys(MODULE_CONFIG) as ModuleType[]
        : [moduleFilter];

      let dateCondition = '';
      const now = new Date();
      if (dateFilter === 'today') {
        dateCondition = now.toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateCondition = weekAgo.toISOString();
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateCondition = monthAgo.toISOString();
      }

      for (const module of modulesToFetch) {
        const config = MODULE_CONFIG[module];
        let query = supabase.from(config.table).select('*').order('created_at', { ascending: false });

        if (dateFilter === 'today') {
          query = query.gte('created_at', `${dateCondition}T00:00:00`).lt('created_at', `${dateCondition}T23:59:59`);
        } else if (dateFilter !== 'all') {
          query = query.gte('created_at', dateCondition);
        }

        const { data } = await query.limit(100);

        if (data) {
          data.forEach(item => {
            allSubmissions.push({
              id: item.id,
              module,
              store_id: item.store_id,
              submitted_by: item.submitted_by,
              created_at: item.created_at,
              type: item.action_type || item.report_type,
              severity: item.severity,
              description: item.description,
              status: item.status
            });
          });
        }
      }

      allSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(allSubmissions);
      setLoading(false);
    };

    fetchData();
  }, [moduleFilter, dateFilter]);

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStore = storeFilter === 'all' || sub.store_id === storeFilter;
    const submitter = profiles[sub.submitted_by];
    const store = stores.find(s => s.id === sub.store_id);
    const matchesSearch = !searchQuery ||
      submitter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submitter?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStore && matchesSearch;
  });

  const getModuleIcon = (module: ModuleType) => {
    const config = MODULE_CONFIG[module];
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`badge-brutal ${colors[severity] || 'bg-gray-100 text-gray-800'}`}>
        {severity}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-brutal">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, store, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-brutal pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value as ModuleType | 'all')}
                className="select-brutal pr-10"
              >
                <option value="all">All Modules</option>
                {Object.entries(MODULE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="select-brutal pr-10"
              >
                <option value="all">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.store_number})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                className="select-brutal pl-10 pr-10"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="text-sm font-medium text-gray-600 mb-4">
          Showing {filteredSubmissions.length} submissions
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-3 border-brutal-black">
                <th className="text-left py-3 px-4 font-bold">Module</th>
                <th className="text-left py-3 px-4 font-bold">Type</th>
                <th className="text-left py-3 px-4 font-bold">Store</th>
                <th className="text-left py-3 px-4 font-bold">Submitted By</th>
                <th className="text-left py-3 px-4 font-bold">Severity</th>
                <th className="text-left py-3 px-4 font-bold">Date</th>
                <th className="text-left py-3 px-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => {
                const config = MODULE_CONFIG[sub.module];
                const store = stores.find(s => s.id === sub.store_id);
                const submitter = profiles[sub.submitted_by];

                return (
                  <tr key={`${sub.module}-${sub.id}`} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 ${config.color} text-white text-xs font-bold border-2 border-brutal-black`}>
                        {getModuleIcon(sub.module)}
                        <span className="hidden sm:inline">{config.label.replace(' Actions', '').replace(' Reports', '')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium capitalize">
                        {sub.type?.replace(/_/g, ' ') || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{store?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className="text-sm">{submitter?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getSeverityBadge(sub.severity)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-3 h-3" />
                        {formatDate(sub.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="p-2 border-2 border-brutal-black bg-blue-100 hover:bg-blue-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No submissions found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-brutal max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Submission Details</h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Module</label>
                <p className="font-medium">{MODULE_CONFIG[selectedSubmission.module].label}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                <p className="font-medium capitalize">{selectedSubmission.type?.replace(/_/g, ' ') || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Store</label>
                <p className="font-medium">
                  {stores.find(s => s.id === selectedSubmission.store_id)?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Submitted By</label>
                <p className="font-medium">
                  {profiles[selectedSubmission.submitted_by]?.full_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">
                  {profiles[selectedSubmission.submitted_by]?.email}
                </p>
              </div>
              {selectedSubmission.severity && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Severity</label>
                  <div className="mt-1">{getSeverityBadge(selectedSubmission.severity)}</div>
                </div>
              )}
              {selectedSubmission.status && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                  <p className="font-medium capitalize">{selectedSubmission.status.replace(/_/g, ' ')}</p>
                </div>
              )}
              {selectedSubmission.description && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                  <p className="text-sm mt-1">{selectedSubmission.description}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Created At</label>
                <p className="font-medium">{formatDate(selectedSubmission.created_at)}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSubmission(null)}
              className="btn-brutal w-full mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
