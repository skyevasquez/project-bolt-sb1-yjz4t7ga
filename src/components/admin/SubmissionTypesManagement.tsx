import { useState, useEffect } from 'react';
import { supabase, type SubmissionType } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Users,
  Package,
  DollarSign,
  ClipboardCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

type ModuleType = 'employee' | 'inventory' | 'cash' | 'store';

const MODULE_CONFIG: Record<ModuleType, { label: string; icon: typeof Users; color: string }> = {
  employee: { label: 'Employee', icon: Users, color: 'bg-blue-500' },
  inventory: { label: 'Inventory', icon: Package, color: 'bg-yellow-500' },
  cash: { label: 'Cash', icon: DollarSign, color: 'bg-pink-500' },
  store: { label: 'Store', icon: ClipboardCheck, color: 'bg-green-500' }
};

interface FormData {
  module: ModuleType;
  type_key: string;
  label: string;
  description: string;
}

const emptyForm: FormData = {
  module: 'employee',
  type_key: '',
  label: '',
  description: ''
};

export function SubmissionTypesManagement() {
  const { user } = useAuth();
  const [types, setTypes] = useState<SubmissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [moduleFilter, setModuleFilter] = useState<ModuleType | 'all'>('all');

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('submission_types')
      .select('*')
      .order('module')
      .order('label');

    if (fetchError) {
      setError('Failed to load submission types');
    } else {
      setTypes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const typeKey = formData.type_key.toLowerCase().replace(/\s+/g, '_');

    if (editingId) {
      const { error: updateError } = await supabase
        .from('submission_types')
        .update({
          label: formData.label,
          description: formData.description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (updateError) {
        setError('Failed to update submission type');
      } else {
        setSuccess('Submission type updated');
        fetchTypes();
        resetForm();
      }
    } else {
      const { error: insertError } = await supabase
        .from('submission_types')
        .insert({
          module: formData.module,
          type_key: typeKey,
          label: formData.label,
          description: formData.description || null,
          created_by: user?.id
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('A submission type with this key already exists for this module');
        } else {
          setError('Failed to create submission type');
        }
      } else {
        setSuccess('Submission type created');
        fetchTypes();
        resetForm();
      }
    }

    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const toggleTypeStatus = async (type: SubmissionType) => {
    const { error: updateError } = await supabase
      .from('submission_types')
      .update({
        is_active: !type.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', type.id);

    if (updateError) {
      setError('Failed to update status');
    } else {
      setTypes(types.map(t =>
        t.id === type.id ? { ...t, is_active: !t.is_active } : t
      ));
      setSuccess(`Type ${type.is_active ? 'disabled' : 'enabled'}`);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const deleteType = async (type: SubmissionType) => {
    if (!confirm(`Are you sure you want to delete "${type.label}"? This cannot be undone.`)) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('submission_types')
      .delete()
      .eq('id', type.id);

    if (deleteError) {
      setError('Failed to delete submission type');
    } else {
      setTypes(types.filter(t => t.id !== type.id));
      setSuccess('Submission type deleted');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const startEdit = (type: SubmissionType) => {
    setEditingId(type.id);
    setFormData({
      module: type.module,
      type_key: type.type_key,
      label: type.label,
      description: type.description || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const filteredTypes = types.filter(
    type => moduleFilter === 'all' || type.module === moduleFilter
  );

  const groupedTypes = filteredTypes.reduce((acc, type) => {
    if (!acc[type.module]) {
      acc[type.module] = [];
    }
    acc[type.module].push(type);
    return acc;
  }, {} as Record<ModuleType, SubmissionType[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border-3 border-red-500 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border-3 border-green-500 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">{success}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModuleFilter('all')}
            className={`px-3 py-2 text-sm font-bold border-2 border-brutal-black transition-colors ${
              moduleFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-100'
            }`}
          >
            All Modules
          </button>
          {(Object.keys(MODULE_CONFIG) as ModuleType[]).map((module) => {
            const config = MODULE_CONFIG[module];
            const Icon = config.icon;
            return (
              <button
                key={module}
                onClick={() => setModuleFilter(module)}
                className={`px-3 py-2 text-sm font-bold border-2 border-brutal-black transition-colors flex items-center gap-2 ${
                  moduleFilter === module ? `${config.color} text-white` : 'bg-white hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-brutal-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Type
        </button>
      </div>

      {showForm && (
        <div className="card-brutal">
          <h3 className="text-lg font-bold mb-4">
            {editingId ? 'Edit Submission Type' : 'New Submission Type'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Module</label>
                <select
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value as ModuleType })}
                  disabled={!!editingId}
                  className="select-brutal disabled:opacity-50"
                >
                  {(Object.keys(MODULE_CONFIG) as ModuleType[]).map((module) => (
                    <option key={module} value={module}>
                      {MODULE_CONFIG[module].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Type Key</label>
                <input
                  type="text"
                  value={formData.type_key}
                  onChange={(e) => setFormData({ ...formData, type_key: e.target.value })}
                  disabled={!!editingId}
                  className="input-brutal disabled:opacity-50"
                  placeholder="e.g., incident_report"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, underscores)</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Display Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input-brutal"
                placeholder="e.g., Incident Report"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-brutal min-h-[80px]"
                placeholder="Brief description of this submission type..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-brutal-primary flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {editingId ? 'Save Changes' : 'Create Type'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-brutal flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {(Object.keys(groupedTypes) as ModuleType[]).map((module) => {
        const config = MODULE_CONFIG[module];
        const Icon = config.icon;
        const moduleTypes = groupedTypes[module];

        return (
          <div key={module} className="card-brutal p-0 overflow-hidden">
            <div className={`${config.color} p-4 border-b-3 border-brutal-black flex items-center gap-3`}>
              <div className="w-10 h-10 bg-white border-2 border-brutal-black flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{config.label} Types</h3>
              <span className="ml-auto bg-white text-brutal-black px-2 py-1 text-sm font-bold border-2 border-brutal-black">
                {moduleTypes.length}
              </span>
            </div>
            <div className="divide-y divide-gray-200">
              {moduleTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 flex items-center gap-4 ${!type.is_active ? 'bg-gray-50 opacity-75' : ''}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{type.label}</p>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 border border-gray-300">
                        {type.type_key}
                      </code>
                      {!type.is_active && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 font-bold">
                          Disabled
                        </span>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTypeStatus(type)}
                      className={`p-2 border-2 border-brutal-black transition-colors ${
                        type.is_active
                          ? 'bg-green-100 hover:bg-green-200'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      title={type.is_active ? 'Disable' : 'Enable'}
                    >
                      {type.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(type)}
                      className="p-2 border-2 border-brutal-black bg-blue-100 hover:bg-blue-200 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteType(type)}
                      className="p-2 border-2 border-brutal-black bg-red-100 hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
              {moduleTypes.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No submission types for this module
                </div>
              )}
            </div>
          </div>
        );
      })}

      {filteredTypes.length === 0 && (
        <div className="card-brutal text-center py-12">
          <p className="text-gray-500">No submission types found</p>
        </div>
      )}
    </div>
  );
}
