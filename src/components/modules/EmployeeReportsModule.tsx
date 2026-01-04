import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import {
  supabase,
  type EmployeeReport,
  type ReportFollowUp,
  type ReportType,
  type ReportStatus,
  type ReportSeverity
} from '../../lib/supabase';
import {
  ArrowLeft,
  FileText,
  Plus,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { ReportCard } from './employee-reports/ReportCard';
import { ReportCreationForm } from './employee-reports/ReportCreationForm';
import { ReportDetailView } from './employee-reports/ReportDetailView';
import { REPORT_TYPE_CONFIG, STATUS_CONFIG } from './employee-reports/constants';

interface EmployeeReportsModuleProps {
  onBack: () => void;
}

type ViewMode = 'list' | 'create' | 'detail' | 'my-documents';

export function EmployeeReportsModule({ onBack }: EmployeeReportsModuleProps) {
  const { profile, isRSM, isAdmin } = useAuth();
  const { selectedStore } = useStore();
  const canManageReports = isRSM || isAdmin;

  const [viewMode, setViewMode] = useState<ViewMode>(canManageReports ? 'list' : 'my-documents');
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [followUps, setFollowUps] = useState<ReportFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<EmployeeReport | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ReportType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<ReportSeverity | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!selectedStore || !profile) return;
    setLoading(true);

    let query = supabase
      .from('employee_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (canManageReports) {
      query = query.eq('store_id', selectedStore.id);
    } else {
      query = query.eq('employee_email', profile.email);
    }

    const { data } = await query;
    if (data) setReports(data);
    setLoading(false);
  }, [selectedStore, profile, canManageReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const fetchFollowUps = async (reportId: string) => {
    const { data } = await supabase
      .from('report_follow_ups')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (data) setFollowUps(data);
  };

  const handleViewReport = (report: EmployeeReport) => {
    setSelectedReport(report);
    fetchFollowUps(report.id);
    setViewMode('detail');
  };

  const filteredReports = reports.filter((report) => {
    if (searchTerm && !report.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType && report.report_type !== filterType) return false;
    if (filterStatus && report.status !== filterStatus) return false;
    if (filterSeverity && report.severity !== filterSeverity) return false;
    return true;
  });

  const pendingAcknowledgments = reports.filter(r => r.status === 'pending_acknowledgment').length;
  const overdueFollowUps = reports.filter(r =>
    r.follow_up_date && new Date(r.follow_up_date) < new Date() && r.status !== 'closed'
  ).length;

  if (viewMode === 'create') {
    return (
      <ReportCreationForm
        onBack={() => setViewMode('list')}
        onSuccess={() => {
          fetchReports();
          setViewMode('list');
        }}
      />
    );
  }

  if (viewMode === 'detail' && selectedReport) {
    return (
      <ReportDetailView
        report={selectedReport}
        followUps={followUps}
        onBack={() => {
          setSelectedReport(null);
          setViewMode(canManageReports ? 'list' : 'my-documents');
        }}
        onUpdate={() => {
          fetchReports();
          fetchFollowUps(selectedReport.id);
        }}
        canManage={canManageReports}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 border-3 border-brutal-black bg-brutal-white hover:bg-brutal-gray transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-600 border-3 border-brutal-black flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {canManageReports ? 'Employee Reports' : 'My Documents'}
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              {canManageReports ? 'CAPA, warnings, and recognition documents' : 'View and acknowledge your documents'}
            </p>
          </div>
        </div>
      </div>

      {canManageReports && (pendingAcknowledgments > 0 || overdueFollowUps > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {pendingAcknowledgments > 0 && (
            <div className="p-4 bg-amber-50 border-3 border-brutal-black flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800">{pendingAcknowledgments} Pending Acknowledgments</p>
                <p className="text-sm text-amber-600">Reports awaiting employee signature</p>
              </div>
            </div>
          )}
          {overdueFollowUps > 0 && (
            <div className="p-4 bg-red-50 border-3 border-brutal-black flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-bold text-red-800">{overdueFollowUps} Overdue Follow-ups</p>
                <p className="text-sm text-red-600">Reports past their follow-up date</p>
              </div>
            </div>
          )}
        </div>
      )}

      {canManageReports && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={() => setViewMode('create')}
            className="btn-brutal-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Report
          </button>

          <div className="flex-grow" />

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-brutal pl-10 w-64"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-brutal flex items-center gap-2 ${showFilters ? 'bg-brutal-gray' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {showFilters && canManageReports && (
        <div className="card-brutal p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Report Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ReportType | '')}
                className="input-brutal"
              >
                <option value="">All Types</option>
                {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}
                className="input-brutal"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as ReportSeverity | '')}
                className="input-brutal"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          {(filterType || filterStatus || filterSeverity) && (
            <button
              onClick={() => {
                setFilterType('');
                setFilterStatus('');
                setFilterSeverity('');
              }}
              className="mt-4 text-sm font-bold text-teal-600 hover:text-teal-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="card-brutal p-8 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card-brutal p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="font-bold text-gray-600">
              {canManageReports ? 'No reports found' : 'No documents assigned to you'}
            </p>
            <p className="text-sm text-gray-500">
              {canManageReports ? 'Create your first employee report' : 'You have no pending documents'}
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => handleViewReport(report)}
            />
          ))
        )}
      </div>
    </div>
  );
}
