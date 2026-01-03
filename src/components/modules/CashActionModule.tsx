import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase, type CashAction } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import {
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  Check,
  WifiOff,
  Calculator
} from 'lucide-react';

interface CashActionModuleProps {
  onBack: () => void;
}

type ActionType = 'reconciliation' | 'shortage';
type Shift = 'opening' | 'midday' | 'closing';
type Severity = 'low' | 'medium' | 'high' | 'critical';

export function CashActionModule({ onBack }: CashActionModuleProps) {
  const { profile } = useAuth();
  const { selectedStore } = useStore();
  const { submitWithOfflineSupport, isOnline } = useOfflineSync();

  const [actions, setActions] = useState<CashAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [actionType, setActionType] = useState<ActionType>('reconciliation');
  const [drawerId, setDrawerId] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [shift, setShift] = useState<Shift>('opening');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchActions = async () => {
      if (!selectedStore) return;

      const { data } = await supabase
        .from('cash_actions')
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

  const calculateVariance = (): number => {
    const expected = parseFloat(expectedAmount) || 0;
    const actual = parseFloat(actualAmount) || 0;
    return actual - expected;
  };

  const calculateSeverity = (variance: number): Severity => {
    const absVariance = Math.abs(variance);
    if (absVariance >= 100) return 'critical';
    if (absVariance >= 50) return 'high';
    if (absVariance >= 20) return 'medium';
    return 'low';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStore) return;

    setSubmitting(true);

    const variance = calculateVariance();
    const severity = actionType === 'shortage' ? calculateSeverity(variance) : 'low';

    const newAction = {
      store_id: selectedStore.id,
      submitted_by: profile.id,
      action_type: actionType,
      drawer_id: drawerId,
      expected_amount: parseFloat(expectedAmount) || 0,
      actual_amount: parseFloat(actualAmount) || 0,
      variance,
      severity,
      description: description || null,
      shift,
      synced: isOnline
    };

    const { success, offline } = await submitWithOfflineSupport('cash_actions', newAction);

    if (success) {
      setSubmitSuccess(true);
      setShowForm(false);
      setActionType('reconciliation');
      setDrawerId('');
      setExpectedAmount('');
      setActualAmount('');
      setShift('opening');
      setDescription('');

      if (!offline) {
        setActions((prev) => [{ ...newAction, id: crypto.randomUUID(), created_at: new Date().toISOString() } as CashAction, ...prev]);

        sendNotification({
          type: 'cash_action',
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          submitterName: profile.full_name,
          severity,
          details: {
            drawer_id: drawerId,
            shift,
            expected_amount: parseFloat(expectedAmount) || 0,
            actual_amount: parseFloat(actualAmount) || 0,
            variance,
            description
          }
        });
      }

      setTimeout(() => setSubmitSuccess(false), 3000);
    }

    setSubmitting(false);
  };

  const getSeverityBadge = (sev: Severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800 animate-pulse'
    };
    return <span className={`badge-brutal ${colors[sev]}`}>{sev.toUpperCase()}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const variance = calculateVariance();

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
          <div className="w-12 h-12 bg-metro-magenta border-3 border-brutal-black flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cash Action</h1>
            <p className="text-sm text-gray-600 font-medium">Reconciliation and shortage reports</p>
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-metro-green border-3 border-brutal-black flex items-center gap-3">
          <Check className="w-5 h-5 text-white" />
          <p className="font-bold text-white">Cash action recorded!</p>
          {!isOnline && (
            <span className="ml-auto flex items-center gap-1 text-white text-sm">
              <WifiOff className="w-4 h-4" /> Saved offline
            </span>
          )}
        </div>
      )}

      {!showForm ? (
        <>
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => {
                setActionType('reconciliation');
                setShowForm(true);
              }}
              className="btn-brutal-primary flex items-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Cash Reconciliation
            </button>
            <button
              onClick={() => {
                setActionType('shortage');
                setShowForm(true);
              }}
              className="btn-brutal-danger flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              Report Shortage
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Cash Actions</h2>

            {loading ? (
              <div className="card-brutal p-8 text-center">
                <div className="w-8 h-8 border-4 border-metro-magenta border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : actions.length === 0 ? (
              <div className="card-brutal p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-gray-600">No cash actions recorded</p>
                <p className="text-sm text-gray-500">Start with a reconciliation or shortage report</p>
              </div>
            ) : (
              actions.map((action) => (
                <div
                  key={action.id}
                  className={`card-brutal p-4 ${action.action_type === 'shortage' && action.severity === 'critical' ? 'border-red-500 bg-red-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 border-2 border-brutal-black flex items-center justify-center flex-shrink-0 ${action.action_type === 'shortage' ? 'bg-red-100' : 'bg-brutal-gray'}`}>
                      {action.action_type === 'shortage' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Calculator className="w-5 h-5 text-metro-blue" />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-bold">Drawer {action.drawer_id}</span>
                        <span className="badge-brutal bg-brutal-gray capitalize">
                          {action.shift}
                        </span>
                        <span className="badge-brutal bg-gray-100 capitalize">
                          {action.action_type}
                        </span>
                        {action.action_type === 'shortage' && getSeverityBadge(action.severity)}
                        {!action.synced && (
                          <span className="badge-brutal bg-orange-100 text-orange-800">
                            <WifiOff className="w-3 h-3 mr-1 inline" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-2 p-3 bg-brutal-gray border-2 border-brutal-black">
                        <div>
                          <p className="text-xs font-bold text-gray-600">Expected</p>
                          <p className="font-bold">{formatCurrency(action.expected_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-600">Actual</p>
                          <p className="font-bold">{formatCurrency(action.actual_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-600">Variance</p>
                          <p className={`font-bold ${action.variance < 0 ? 'text-red-600' : action.variance > 0 ? 'text-green-600' : ''}`}>
                            {action.variance >= 0 ? '+' : ''}{formatCurrency(action.variance)}
                          </p>
                        </div>
                      </div>

                      {action.description && (
                        <p className="text-gray-600 text-sm">{action.description}</p>
                      )}
                      <p className="text-xs text-gray-500 font-medium mt-2">
                        {new Date(action.created_at).toLocaleString()}
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
          <div className="flex items-center gap-3 mb-6">
            {actionType === 'shortage' && (
              <div className="p-2 bg-red-100 border-2 border-red-500">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            )}
            <h2 className="text-xl font-bold">
              {actionType === 'shortage' ? 'Report Cash Shortage' : 'Cash Reconciliation'}
            </h2>
          </div>

          {actionType === 'shortage' && (
            <div className="mb-6 p-4 bg-red-100 border-3 border-red-500">
              <p className="font-bold text-red-800">
                Cash shortages are flagged for immediate review. Please provide accurate information.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Drawer ID</label>
                <input
                  type="text"
                  value={drawerId}
                  onChange={(e) => setDrawerId(e.target.value)}
                  className="input-brutal"
                  placeholder="e.g., D1, D2, Register-A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Shift</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['opening', 'midday', 'closing'] as Shift[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`p-3 border-3 border-brutal-black text-center font-bold capitalize transition-all text-sm ${
                        shift === s
                          ? 'bg-metro-purple text-white'
                          : 'bg-brutal-white hover:bg-brutal-gray'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Expected Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  className="input-brutal"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Actual Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="input-brutal"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {(expectedAmount || actualAmount) && (
              <div className={`p-4 border-3 ${variance < 0 ? 'border-red-500 bg-red-50' : variance > 0 ? 'border-green-500 bg-green-50' : 'border-brutal-black bg-brutal-gray'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">Variance</span>
                  <span className={`text-2xl font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : ''}`}>
                    {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                  </span>
                </div>
                {actionType === 'shortage' && variance !== 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-medium">Severity:</span>
                    {getSeverityBadge(calculateSeverity(variance))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-2">Notes / Explanation</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder={actionType === 'shortage' ? 'Explain the circumstances of the shortage...' : 'Any additional notes...'}
                required={actionType === 'shortage'}
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
                className={`flex-1 flex items-center justify-center gap-2 ${actionType === 'shortage' ? 'btn-brutal-danger' : 'btn-brutal-primary'}`}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit
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
