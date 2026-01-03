import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase, type StoreAction, type ChecklistItem } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import {
  ArrowLeft,
  ClipboardCheck,
  Sun,
  Moon,
  Wrench,
  Check,
  WifiOff,
  Camera,
  X
} from 'lucide-react';

interface StoreActionModuleProps {
  onBack: () => void;
}

type ActionType = 'opening_checklist' | 'closing_checklist' | 'maintenance';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

const OPENING_CHECKLIST_ITEMS: Omit<ChecklistItem, 'completed' | 'completed_at'>[] = [
  { id: 'open-1', label: 'Unlock all doors and disable alarm' },
  { id: 'open-2', label: 'Turn on all lights and displays' },
  { id: 'open-3', label: 'Power on POS systems and verify connectivity' },
  { id: 'open-4', label: 'Count opening cash drawer' },
  { id: 'open-5', label: 'Check inventory levels on display floor' },
  { id: 'open-6', label: 'Review previous day notes/issues' },
  { id: 'open-7', label: 'Clean and organize store entrance' },
  { id: 'open-8', label: 'Verify promotional signage is current' }
];

const CLOSING_CHECKLIST_ITEMS: Omit<ChecklistItem, 'completed' | 'completed_at'>[] = [
  { id: 'close-1', label: 'Complete all pending transactions' },
  { id: 'close-2', label: 'Count and reconcile cash drawers' },
  { id: 'close-3', label: 'Power down POS systems properly' },
  { id: 'close-4', label: 'Secure all inventory and displays' },
  { id: 'close-5', label: 'Clean and organize sales floor' },
  { id: 'close-6', label: 'Empty trash and recycling' },
  { id: 'close-7', label: 'Check restrooms and break areas' },
  { id: 'close-8', label: 'Set alarm and lock all doors' }
];

export function StoreActionModule({ onBack }: StoreActionModuleProps) {
  const { profile } = useAuth();
  const { selectedStore } = useStore();
  const { submitWithOfflineSupport, isOnline } = useOfflineSync();

  const [actions, setActions] = useState<StoreAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [actionType, setActionType] = useState<ActionType>('opening_checklist');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [priority, setPriority] = useState<Priority>('medium');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchActions = async () => {
      if (!selectedStore) return;

      const { data } = await supabase
        .from('store_actions')
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

  const initializeChecklist = (type: ActionType) => {
    const items = type === 'opening_checklist' ? OPENING_CHECKLIST_ITEMS : CLOSING_CHECKLIST_ITEMS;
    setChecklistItems(
      items.map((item) => ({
        ...item,
        completed: false,
        completed_at: null
      }))
    );
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              completed_at: !item.completed ? new Date().toISOString() : null
            }
          : item
      )
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStore) return;

    setSubmitting(true);

    const completedCount = checklistItems.filter((i) => i.completed).length;
    const isFullyCompleted = actionType === 'maintenance' || completedCount === checklistItems.length;

    const newAction = {
      store_id: selectedStore.id,
      submitted_by: profile.id,
      action_type: actionType,
      checklist_items: actionType !== 'maintenance' ? checklistItems : [],
      priority,
      description: description || null,
      photo_url: photoPreview,
      completed_at: isFullyCompleted ? new Date().toISOString() : null,
      synced: isOnline
    };

    const { success, offline } = await submitWithOfflineSupport('store_actions', newAction);

    if (success) {
      setSubmitSuccess(true);
      setShowForm(false);
      setActionType('opening_checklist');
      setChecklistItems([]);
      setPriority('medium');
      setDescription('');
      setPhotoPreview(null);

      if (!offline) {
        setActions((prev) => [{ ...newAction, id: crypto.randomUUID(), created_at: new Date().toISOString() } as StoreAction, ...prev]);

        sendNotification({
          type: 'store_action',
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          submitterName: profile.full_name,
          actionType: actionType,
          details: {
            checklist_items: checklistItems,
            priority,
            description
          }
        });
      }

      setTimeout(() => setSubmitSuccess(false), 3000);
    }

    setSubmitting(false);
  };

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'opening_checklist':
        return <Sun className="w-5 h-5 text-metro-yellow" />;
      case 'closing_checklist':
        return <Moon className="w-5 h-5 text-metro-purple" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-metro-orange" />;
    }
  };

  const getPriorityBadge = (p: Priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800 animate-pulse'
    };
    return <span className={`badge-brutal ${colors[p]}`}>{p.toUpperCase()}</span>;
  };

  const completedCount = checklistItems.filter((i) => i.completed).length;
  const totalCount = checklistItems.length;

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
          <div className="w-12 h-12 bg-metro-green border-3 border-brutal-black flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Store Action</h1>
            <p className="text-sm text-gray-600 font-medium">Checklists and maintenance</p>
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-metro-green border-3 border-brutal-black flex items-center gap-3">
          <Check className="w-5 h-5 text-white" />
          <p className="font-bold text-white">Store action recorded!</p>
          {!isOnline && (
            <span className="ml-auto flex items-center gap-1 text-white text-sm">
              <WifiOff className="w-4 h-4" /> Saved offline
            </span>
          )}
        </div>
      )}

      {!showForm ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => {
                setActionType('opening_checklist');
                initializeChecklist('opening_checklist');
                setShowForm(true);
              }}
              className="card-brutal p-4 text-left hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 bg-metro-yellow border-3 border-brutal-black flex items-center justify-center mb-3">
                <Sun className="w-6 h-6 text-brutal-black" />
              </div>
              <h3 className="font-bold">Opening Checklist</h3>
              <p className="text-sm text-gray-600">Start of day procedures</p>
            </button>

            <button
              onClick={() => {
                setActionType('closing_checklist');
                initializeChecklist('closing_checklist');
                setShowForm(true);
              }}
              className="card-brutal p-4 text-left hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 bg-metro-purple border-3 border-brutal-black flex items-center justify-center mb-3">
                <Moon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold">Closing Checklist</h3>
              <p className="text-sm text-gray-600">End of day procedures</p>
            </button>

            <button
              onClick={() => {
                setActionType('maintenance');
                setChecklistItems([]);
                setShowForm(true);
              }}
              className="card-brutal p-4 text-left hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 bg-metro-orange border-3 border-brutal-black flex items-center justify-center mb-3">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold">Maintenance Request</h3>
              <p className="text-sm text-gray-600">Report facility issues</p>
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Store Actions</h2>

            {loading ? (
              <div className="card-brutal p-8 text-center">
                <div className="w-8 h-8 border-4 border-metro-green border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : actions.length === 0 ? (
              <div className="card-brutal p-8 text-center">
                <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-gray-600">No store actions yet</p>
                <p className="text-sm text-gray-500">Complete your first checklist or maintenance request</p>
              </div>
            ) : (
              actions.map((action) => {
                const items = action.checklist_items as ChecklistItem[];
                const completed = items.filter((i) => i.completed).length;
                const total = items.length;

                return (
                  <div key={action.id} className="card-brutal p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-brutal-gray border-2 border-brutal-black flex items-center justify-center flex-shrink-0">
                        {getActionIcon(action.action_type)}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-bold capitalize">
                            {action.action_type.replace('_', ' ')}
                          </span>
                          {action.action_type === 'maintenance' && getPriorityBadge(action.priority)}
                          {action.completed_at && (
                            <span className="badge-brutal bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1 inline" />
                              Complete
                            </span>
                          )}
                          {!action.synced && (
                            <span className="badge-brutal bg-orange-100 text-orange-800">
                              <WifiOff className="w-3 h-3 mr-1 inline" />
                              Pending
                            </span>
                          )}
                        </div>

                        {total > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-grow h-3 bg-brutal-gray border-2 border-brutal-black">
                                <div
                                  className="h-full bg-metro-green transition-all"
                                  style={{ width: `${(completed / total) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold">{completed}/{total}</span>
                            </div>
                          </div>
                        )}

                        {action.description && (
                          <p className="text-gray-600 text-sm">{action.description}</p>
                        )}
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          {new Date(action.created_at).toLocaleString()}
                        </p>
                      </div>
                      {action.photo_url && (
                        <div className="w-16 h-16 border-2 border-brutal-black overflow-hidden flex-shrink-0">
                          <img
                            src={action.photo_url}
                            alt="Action"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="card-brutal">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 border-3 border-brutal-black flex items-center justify-center ${
              actionType === 'opening_checklist' ? 'bg-metro-yellow' :
              actionType === 'closing_checklist' ? 'bg-metro-purple' : 'bg-metro-orange'
            }`}>
              {getActionIcon(actionType)}
            </div>
            <h2 className="text-xl font-bold capitalize">
              {actionType.replace('_', ' ')}
            </h2>
          </div>

          <div className="space-y-6">
            {actionType !== 'maintenance' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold">Progress: {completedCount}/{totalCount}</span>
                  <div className="w-32 h-3 bg-brutal-gray border-2 border-brutal-black">
                    <div
                      className="h-full bg-metro-green transition-all"
                      style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-full p-4 border-3 border-brutal-black text-left flex items-center gap-3 transition-all ${
                        item.completed
                          ? 'bg-metro-green text-white'
                          : 'bg-brutal-white hover:bg-brutal-gray'
                      }`}
                    >
                      <div className={`w-6 h-6 border-3 border-brutal-black flex items-center justify-center flex-shrink-0 ${
                        item.completed ? 'bg-white' : 'bg-brutal-white'
                      }`}>
                        {item.completed && <Check className="w-4 h-4 text-metro-green" />}
                      </div>
                      <span className="font-medium">
                        {index + 1}. {item.label}
                      </span>
                      {item.completed_at && (
                        <span className="ml-auto text-xs opacity-75">
                          {new Date(item.completed_at).toLocaleTimeString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`p-3 border-3 border-brutal-black text-center font-bold capitalize transition-all text-sm ${
                          priority === p
                            ? p === 'low'
                              ? 'bg-green-500 text-white'
                              : p === 'medium'
                                ? 'bg-metro-blue text-white'
                                : p === 'high'
                                  ? 'bg-metro-orange text-white'
                                  : 'bg-red-500 text-white'
                            : 'bg-brutal-white hover:bg-brutal-gray'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Issue Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-brutal min-h-32 resize-y"
                    placeholder="Describe the maintenance issue in detail..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Photo (Optional)</label>
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover border-3 border-brutal-black"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 border-2 border-brutal-black flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full p-6 border-3 border-dashed border-brutal-black cursor-pointer hover:bg-brutal-gray transition-colors">
                      <div className="text-center">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="font-bold text-gray-600">Click to add photo</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </>
            )}

            {actionType !== 'maintenance' && (
              <div>
                <label className="block text-sm font-bold mb-2">Notes (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-brutal min-h-20 resize-y"
                  placeholder="Any additional notes for this checklist..."
                />
              </div>
            )}

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
                disabled={submitting || (actionType !== 'maintenance' && completedCount < totalCount)}
                className="btn-brutal-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {actionType === 'maintenance' ? 'Submit Request' : 'Complete Checklist'}
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
