import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { supabase, type InventoryAction } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import {
  ArrowLeft,
  Package,
  Plus,
  AlertTriangle,
  ClipboardList,
  Check,
  WifiOff,
  Camera,
  X
} from 'lucide-react';

interface InventoryActionModuleProps {
  onBack: () => void;
}

type ActionType = 'audit' | 'problem';
type IssueType = 'damaged' | 'missing' | 'discrepancy';

export function InventoryActionModule({ onBack }: InventoryActionModuleProps) {
  const { profile } = useAuth();
  const { selectedStore } = useStore();
  const { submitWithOfflineSupport, isOnline } = useOfflineSync();

  const [actions, setActions] = useState<InventoryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [actionType, setActionType] = useState<ActionType>('audit');
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [issueType, setIssueType] = useState<IssueType | ''>('');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchActions = async () => {
      if (!selectedStore) return;

      const { data } = await supabase
        .from('inventory_actions')
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

    const newAction = {
      store_id: selectedStore.id,
      submitted_by: profile.id,
      action_type: actionType,
      item_name: itemName,
      item_sku: itemSku || null,
      quantity: parseInt(quantity) || 0,
      issue_type: actionType === 'problem' ? issueType || null : null,
      description: description || null,
      photo_url: photoPreview,
      synced: isOnline
    };

    const { success, offline } = await submitWithOfflineSupport('inventory_actions', newAction);

    if (success) {
      setSubmitSuccess(true);
      setShowForm(false);
      setActionType('audit');
      setItemName('');
      setItemSku('');
      setQuantity('');
      setIssueType('');
      setDescription('');
      setPhotoPreview(null);

      if (!offline) {
        setActions((prev) => [{ ...newAction, id: crypto.randomUUID(), created_at: new Date().toISOString() } as InventoryAction, ...prev]);

        sendNotification({
          type: 'inventory_action',
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          submitterName: profile.full_name,
          actionType: actionType,
          details: {
            item_name: itemName,
            item_sku: itemSku,
            quantity: parseInt(quantity) || 0,
            issue_type: issueType,
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
      case 'audit':
        return <ClipboardList className="w-5 h-5 text-metro-blue" />;
      case 'problem':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getIssueTypeBadge = (type: IssueType | null) => {
    if (!type) return null;
    const colors = {
      damaged: 'bg-red-100 text-red-800',
      missing: 'bg-orange-100 text-orange-800',
      discrepancy: 'bg-yellow-100 text-yellow-800'
    };
    return <span className={`badge-brutal ${colors[type]}`}>{type.toUpperCase()}</span>;
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
          <div className="w-12 h-12 bg-metro-yellow border-3 border-brutal-black flex items-center justify-center">
            <Package className="w-6 h-6 text-brutal-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inventory Action</h1>
            <p className="text-sm text-gray-600 font-medium">Stock audits and problem reports</p>
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-metro-green border-3 border-brutal-black flex items-center gap-3">
          <Check className="w-5 h-5 text-white" />
          <p className="font-bold text-white">Inventory action recorded!</p>
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
            className="btn-brutal-warning mb-8 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Inventory Action
          </button>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Inventory Actions</h2>

            {loading ? (
              <div className="card-brutal p-8 text-center">
                <div className="w-8 h-8 border-4 border-metro-yellow border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : actions.length === 0 ? (
              <div className="card-brutal p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-gray-600">No inventory actions yet</p>
                <p className="text-sm text-gray-500">Start your first audit or report a problem</p>
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
                        <span className="font-bold">{action.item_name}</span>
                        {action.item_sku && (
                          <span className="badge-brutal bg-brutal-gray text-xs">
                            SKU: {action.item_sku}
                          </span>
                        )}
                        <span className="badge-brutal bg-gray-100 capitalize">
                          {action.action_type}
                        </span>
                        {getIssueTypeBadge(action.issue_type)}
                        {!action.synced && (
                          <span className="badge-brutal bg-orange-100 text-orange-800">
                            <WifiOff className="w-3 h-3 mr-1 inline" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        Quantity: <span className="font-bold">{action.quantity}</span>
                      </p>
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
                          alt="Inventory"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="card-brutal">
          <h2 className="text-xl font-bold mb-6">New Inventory Action</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">Action Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('audit')}
                  className={`p-4 border-3 border-brutal-black text-center font-bold transition-all ${
                    actionType === 'audit'
                      ? 'bg-metro-blue text-white shadow-brutal-sm -translate-x-0.5 -translate-y-0.5'
                      : 'bg-brutal-white hover:bg-brutal-gray'
                  }`}
                >
                  <ClipboardList className="w-6 h-6 mx-auto mb-2" />
                  Stock Audit
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('problem')}
                  className={`p-4 border-3 border-brutal-black text-center font-bold transition-all ${
                    actionType === 'problem'
                      ? 'bg-red-500 text-white shadow-brutal-sm -translate-x-0.5 -translate-y-0.5'
                      : 'bg-brutal-white hover:bg-brutal-gray'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                  Problem Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Item Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="input-brutal"
                  placeholder="e.g., iPhone 15 Pro Case"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">SKU (Optional)</label>
                <input
                  type="text"
                  value={itemSku}
                  onChange={(e) => setItemSku(e.target.value)}
                  className="input-brutal"
                  placeholder="e.g., IP15P-CASE-BLK"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-brutal"
                placeholder="Enter quantity"
                min="0"
                required
              />
            </div>

            {actionType === 'problem' && (
              <div>
                <label className="block text-sm font-bold mb-2">Issue Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['damaged', 'missing', 'discrepancy'] as IssueType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIssueType(type)}
                      className={`p-3 border-3 border-brutal-black text-center font-bold capitalize transition-all ${
                        issueType === type
                          ? type === 'damaged'
                            ? 'bg-red-500 text-white'
                            : type === 'missing'
                              ? 'bg-metro-orange text-white'
                              : 'bg-metro-yellow text-brutal-black'
                          : 'bg-brutal-white hover:bg-brutal-gray'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Provide additional details..."
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
                className="btn-brutal-warning flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-brutal-black border-t-transparent rounded-full animate-spin" />
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
