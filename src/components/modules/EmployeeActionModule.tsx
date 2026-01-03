import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase, type EmployeeAction } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import {
  ArrowLeft,
  Users,
  Plus,
  AlertTriangle,
  Award,
  Clock,
  Check,
  WifiOff
} from 'lucide-react';

interface EmployeeActionModuleProps {
  onBack: () => void;
}

type ActionType = 'incident' | 'kudos' | 'attendance';
type Severity = 'low' | 'medium' | 'high';

export function EmployeeActionModule({ onBack }: EmployeeActionModuleProps) {
  const { profile } = useAuth();
  const { selectedStore } = useStore();
  const { submitWithOfflineSupport, isOnline } = useOfflineSync();

  const [actions, setActions] = useState<EmployeeAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [employeeName, setEmployeeName] = useState('');
  const [actionType, setActionType] = useState<ActionType>('incident');
  const [severity, setSeverity] = useState<Severity>('low');
  const [description, setDescription] = useState('');
  const [actionDate, setActionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchActions = async () => {
      if (!selectedStore) return;

      const { data } = await supabase
        .from('employee_actions')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setActions(data);
      }
      setLoading(false);
    };

    fetchActions();
  }, [selectedStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStore) return;

    setSubmitting(true);

    const newAction = {
      store_id: selectedStore.id,
      submitted_by: profile.id,
      employee_name: employeeName,
      action_type: actionType,
      severity,
      description,
      action_date: actionDate,
      synced: isOnline
    };

    const { success, offline } = await submitWithOfflineSupport('employee_actions', newAction);

    if (success) {
      setSubmitSuccess(true);
      setShowForm(false);
      setEmployeeName('');
      setActionType('incident');
      setSeverity('low');
      setDescription('');
      setActionDate(new Date().toISOString().split('T')[0]);

      if (!offline) {
        setActions((prev) => [{ ...newAction, id: crypto.randomUUID(), created_at: new Date().toISOString() } as EmployeeAction, ...prev]);

        sendNotification({
          type: 'employee_action',
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          submitterName: profile.full_name,
          severity,
          details: {
            employee_name: employeeName,
            action_type: actionType,
            description,
            action_date: actionDate
          }
        });
      }

      setTimeout(() => setSubmitSuccess(false), 3000);
    }

    setSubmitting(false);
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'incident':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'kudos':
        return <Award className="w-5 h-5 text-metro-green" />;
      case 'attendance':
        return <Clock className="w-5 h-5 text-metro-blue" />;
    }
  };

  const getSeverityBadge = (sev: Severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return <span className={`badge-brutal ${colors[sev]}`}>{sev.toUpperCase()}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 border-3 border-brutal-black bg-brutal-white hover:bg-brutal-gray transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-metro-blue border-3 border-brutal-black flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Employee Action</h1>
            <p className="text-sm text-gray-600 font-medium">Log incidents, kudos, and attendance</p>
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-metro-green border-3 border-brutal-black flex items-center gap-3">
          <Check className="w-5 h-5 text-white" />
          <p className="font-bold text-white">Action logged successfully!</p>
          {!isOnline && (
            <span className="ml-auto flex items-center gap-1 text-white text-sm">
              <WifiOff className="w-4 h-4" /> Saved offline
            </span>
          )}
        </div>
      )}

      {!showForm ? (
        <>
          <button
            onClick={() => setShowForm(true)}
            className="btn-brutal-primary mb-8 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Employee Action
          </button>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Actions</h2>

            {loading ? (
              <div className="card-brutal p-8 text-center">
                <div className="w-8 h-8 border-4 border-metro-blue border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : actions.length === 0 ? (
              <div className="card-brutal p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-gray-600">No actions recorded yet</p>
                <p className="text-sm text-gray-500">Log your first employee action</p>
              </div>
            ) : (
              actions.map((action) => (
                <div key={action.id} className="card-brutal p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-brutal-gray border-2 border-brutal-black flex items-center justify-center flex-shrink-0">
                      {getActionIcon(action.action_type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold">{action.employee_name}</span>
                        <span className="badge-brutal bg-brutal-gray capitalize">
                          {action.action_type}
                        </span>
                        {getSeverityBadge(action.severity)}
                        {!action.synced && (
                          <span className="badge-brutal bg-orange-100 text-orange-800">
                            <WifiOff className="w-3 h-3 mr-1 inline" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{action.description}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date(action.action_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="card-brutal">
          <h2 className="text-xl font-bold mb-6">Log Employee Action</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">Employee Name</label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="input-brutal"
                placeholder="Enter employee name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Action Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(['incident', 'kudos', 'attendance'] as ActionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActionType(type)}
                    className={`p-4 border-3 border-brutal-black text-center font-bold capitalize transition-all ${
                      actionType === type
                        ? 'bg-metro-blue text-white shadow-brutal-sm -translate-x-0.5 -translate-y-0.5'
                        : 'bg-brutal-white hover:bg-brutal-gray'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as Severity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`p-3 border-3 border-brutal-black text-center font-bold capitalize transition-all ${
                      severity === sev
                        ? sev === 'low'
                          ? 'bg-metro-green text-white'
                          : sev === 'medium'
                            ? 'bg-metro-yellow text-brutal-black'
                            : 'bg-red-500 text-white'
                        : 'bg-brutal-white hover:bg-brutal-gray'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Date</label>
              <input
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                className="input-brutal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-brutal min-h-32 resize-y"
                placeholder="Provide details about this action..."
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-brutal flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-brutal-primary flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit Action
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
