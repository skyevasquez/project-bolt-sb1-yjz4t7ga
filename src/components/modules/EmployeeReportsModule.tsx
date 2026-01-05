import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  supabase,
  type EmployeeReport,
  type ReportFollowUp,
  type ReportType,
  type ReportCategory,
  type ReportStatus,
  type ReportSeverity
} from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import {
  ArrowLeft,
  FileText,
  Plus,
  AlertTriangle,
  Award,
  ClipboardCheck,
  Clock,
  Check,
  WifiOff,
  Search,
  Filter,
  Eye,
  Printer,
  ChevronDown,
  Calendar,
  MessageSquare,
  X,
  Edit3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface EmployeeReportsModuleProps {
  onBack: () => void;
}

type ViewMode = 'list' | 'create' | 'detail' | 'my-documents';

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; category: ReportCategory; icon: typeof FileText; color: string }> = {
  capa: { label: 'CAPA Report', category: 'corrective', icon: ClipboardCheck, color: 'bg-blue-600' },
  written_warning: { label: 'Written Warning', category: 'disciplinary', icon: AlertTriangle, color: 'bg-red-600' },
  verbal_warning: { label: 'Verbal Warning', category: 'disciplinary', icon: AlertCircle, color: 'bg-orange-500' },
  recognition: { label: 'Recognition', category: 'commendation', icon: Award, color: 'bg-green-600' },
  performance_improvement: { label: 'Performance Improvement Plan', category: 'corrective', icon: FileText, color: 'bg-amber-600' }
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  pending_acknowledgment: { label: 'Pending Acknowledgment', color: 'bg-amber-500' },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-cyan-500' },
  pending_verification: { label: 'Pending Verification', color: 'bg-purple-500' },
  closed: { label: 'Closed', color: 'bg-green-600' }
};

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

  useEffect(() => {
    fetchReports();
  }, [selectedStore, profile, canManageReports]);

  const fetchReports = async () => {
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
  };

  const fetchFollowUps = useCallback(async (reportId: string) => {
    const { data } = await supabase
      .from('report_follow_ups')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (data) setFollowUps(data);
  }, []);

  const handleViewReport = useCallback((report: EmployeeReport) => {
    setSelectedReport(report);
    fetchFollowUps(report.id);
    setViewMode('detail');
  }, [fetchFollowUps]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    if (searchTerm && !report.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType && report.report_type !== filterType) return false;
    if (filterStatus && report.status !== filterStatus) return false;
    if (filterSeverity && report.severity !== filterSeverity) return false;
    return true;
  }), [reports, searchTerm, filterType, filterStatus, filterSeverity]);

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
              onClick={handleViewReport}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ReportCardProps {
  report: EmployeeReport;
  onClick: (report: EmployeeReport) => void;
}

const ReportCard = memo(function ReportCard({ report, onClick }: ReportCardProps) {
  const config = REPORT_TYPE_CONFIG[report.report_type];
  const statusConfig = STATUS_CONFIG[report.status];
  const Icon = config.icon;

  const isOverdue = report.follow_up_date && new Date(report.follow_up_date) < new Date() && report.status !== 'closed';

  return (
    <button
      onClick={() => onClick(report)}
      className="card-brutal p-4 w-full text-left hover:shadow-brutal-hover hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 ${config.color} border-2 border-brutal-black flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-lg">{report.employee_name}</span>
            <span className={`px-2 py-0.5 text-xs font-bold text-white ${statusConfig.color} border border-brutal-black`}>
              {statusConfig.label}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-600 border border-brutal-black">
                OVERDUE
              </span>
            )}
            {!report.synced && (
              <span className="badge-brutal bg-orange-100 text-orange-800">
                <WifiOff className="w-3 h-3 mr-1 inline" />
                Pending
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-600 mb-2">{config.label}</p>
          <p className="text-gray-700 line-clamp-2 mb-2">{report.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(report.incident_date).toLocaleDateString()}
            </span>
            {report.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due: {new Date(report.due_date).toLocaleDateString()}
              </span>
            )}
            <span className={`px-2 py-0.5 font-bold uppercase ${
              report.severity === 'critical' ? 'bg-red-100 text-red-800' :
              report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
              report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {report.severity}
            </span>
          </div>
        </div>
        <Eye className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  );
});

function ReportCreationForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const { selectedStore } = useStore();
  const { submitWithOfflineSupport, isOnline } = useOfflineSync();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [reportType, setReportType] = useState<ReportType>('capa');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('medium');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [description, setDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [policyReference, setPolicyReference] = useState('');
  const [previousWarnings, setPreviousWarnings] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [consequences, setConsequences] = useState('');
  const [goals, setGoals] = useState('');
  const [metrics, setMetrics] = useState('');
  const [supportProvided, setSupportProvided] = useState('');
  const [achievementDescription, setAchievementDescription] = useState('');
  const [impactStatement, setImpactStatement] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessTitle, setWitnessTitle] = useState('');

  const config = REPORT_TYPE_CONFIG[reportType];

  const handleSubmit = async (status: ReportStatus) => {
    if (!profile || !selectedStore) return;
    setSubmitting(true);

    const newReport = {
      store_id: selectedStore.id,
      submitted_by: profile.id,
      employee_name: employeeName,
      employee_email: employeeEmail || null,
      report_type: reportType,
      category: config.category,
      severity,
      status,
      incident_date: incidentDate,
      due_date: dueDate || null,
      follow_up_date: followUpDate || null,
      description,
      root_cause: rootCause || null,
      corrective_action: correctiveAction || null,
      preventive_measures: preventiveMeasures || null,
      policy_reference: policyReference || null,
      previous_warnings: previousWarnings || null,
      expected_behavior: expectedBehavior || null,
      consequences: consequences || null,
      goals: goals || null,
      metrics: metrics || null,
      support_provided: supportProvided || null,
      achievement_description: achievementDescription || null,
      impact_statement: impactStatement || null,
      recommendation: recommendation || null,
      witness_name: witnessName || null,
      witness_title: witnessTitle || null,
      synced: isOnline
    };

    const { success } = await submitWithOfflineSupport('employee_reports', newReport);

    if (success) {
      if (status === 'pending_acknowledgment' && employeeEmail) {
        sendNotification({
          type: 'employee_report',
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          submitterName: profile.full_name,
          severity,
          details: {
            employee_name: employeeName,
            employee_email: employeeEmail,
            report_type: reportType,
            description
          }
        });
      }
      onSuccess();
    }
    setSubmitting(false);
  };

  const renderTypeSpecificFields = () => {
    switch (reportType) {
      case 'capa':
        return (
          <>
            <div>
              <label className="block text-sm font-bold mb-2">Root Cause Analysis *</label>
              <textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Identify the underlying cause of the issue..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Corrective Action *</label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Actions to correct the immediate issue..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Preventive Measures *</label>
              <textarea
                value={preventiveMeasures}
                onChange={(e) => setPreventiveMeasures(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Measures to prevent recurrence..."
                required
              />
            </div>
          </>
        );

      case 'written_warning':
      case 'verbal_warning':
        return (
          <>
            <div>
              <label className="block text-sm font-bold mb-2">Policy Reference</label>
              <input
                type="text"
                value={policyReference}
                onChange={(e) => setPolicyReference(e.target.value)}
                className="input-brutal"
                placeholder="e.g., Employee Handbook Section 4.2"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Previous Warnings</label>
              <textarea
                value={previousWarnings}
                onChange={(e) => setPreviousWarnings(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="Document any previous verbal/written warnings..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Expected Behavior *</label>
              <textarea
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Clearly state the expected behavior going forward..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Consequences *</label>
              <textarea
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="Consequences if behavior continues..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Witness Name</label>
                <input
                  type="text"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="input-brutal"
                  placeholder="Witness name (if any)"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Witness Title</label>
                <input
                  type="text"
                  value={witnessTitle}
                  onChange={(e) => setWitnessTitle(e.target.value)}
                  className="input-brutal"
                  placeholder="Witness job title"
                />
              </div>
            </div>
          </>
        );

      case 'performance_improvement':
        return (
          <>
            <div>
              <label className="block text-sm font-bold mb-2">Performance Goals *</label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Specific, measurable goals the employee must achieve..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Success Metrics *</label>
              <textarea
                value={metrics}
                onChange={(e) => setMetrics(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="How progress will be measured..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Support Provided</label>
              <textarea
                value={supportProvided}
                onChange={(e) => setSupportProvided(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="Training, resources, or support being provided..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Consequences</label>
              <textarea
                value={consequences}
                onChange={(e) => setConsequences(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="Consequences if goals are not met..."
              />
            </div>
          </>
        );

      case 'recognition':
        return (
          <>
            <div>
              <label className="block text-sm font-bold mb-2">Achievement Description *</label>
              <textarea
                value={achievementDescription}
                onChange={(e) => setAchievementDescription(e.target.value)}
                className="input-brutal min-h-24 resize-y"
                placeholder="Describe the achievement or exemplary behavior..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Impact Statement *</label>
              <textarea
                value={impactStatement}
                onChange={(e) => setImpactStatement(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="How this achievement impacted the team/store/company..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Recommendation</label>
              <textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="input-brutal min-h-20 resize-y"
                placeholder="Any recommendations for rewards or recognition..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
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
          <div className={`w-12 h-12 ${config.color} border-3 border-brutal-black flex items-center justify-center`}>
            <config.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create {config.label}</h1>
            <p className="text-sm text-gray-600 font-medium">Step {step} of 2</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <div className={`flex-1 h-2 ${step >= 1 ? 'bg-teal-600' : 'bg-gray-300'} border border-brutal-black`} />
        <div className={`flex-1 h-2 ${step >= 2 ? 'bg-teal-600' : 'bg-gray-300'} border border-brutal-black`} />
      </div>

      {step === 1 && (
        <div className="card-brutal">
          <h2 className="text-xl font-bold mb-6">Basic Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">Report Type</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((type) => {
                  const cfg = REPORT_TYPE_CONFIG[type];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type)}
                      className={`p-4 border-3 border-brutal-black text-left transition-all ${
                        reportType === type
                          ? `${cfg.color} text-white shadow-brutal-sm -translate-x-0.5 -translate-y-0.5`
                          : 'bg-brutal-white hover:bg-brutal-gray'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${reportType === type ? 'text-white' : 'text-gray-600'}`} />
                      <span className="font-bold block">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Employee Name *</label>
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
                <label className="block text-sm font-bold mb-2">Employee Email</label>
                <input
                  type="email"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="input-brutal"
                  placeholder="For acknowledgment notifications"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Incident Date *</label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="input-brutal"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-brutal"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-brutal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Severity</label>
              <div className="grid grid-cols-4 gap-3">
                {(['low', 'medium', 'high', 'critical'] as ReportSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`p-3 border-3 border-brutal-black text-center font-bold capitalize transition-all ${
                      severity === sev
                        ? sev === 'low'
                          ? 'bg-green-500 text-white'
                          : sev === 'medium'
                            ? 'bg-yellow-500 text-brutal-black'
                            : sev === 'high'
                              ? 'bg-orange-500 text-white'
                              : 'bg-red-600 text-white'
                        : 'bg-brutal-white hover:bg-brutal-gray'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-brutal min-h-32 resize-y"
                placeholder="Provide a detailed description of the issue or achievement..."
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!employeeName || !description}
                className="btn-brutal-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card-brutal">
          <h2 className="text-xl font-bold mb-6">{config.label} Details</h2>
          <div className="space-y-6">
            {renderTypeSpecificFields()}

            <div className="flex gap-4 pt-4 border-t-3 border-brutal-black">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-brutal"
              >
                Back
              </button>
              <div className="flex-grow" />
              <button
                onClick={() => handleSubmit('draft')}
                disabled={submitting}
                className="btn-brutal"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('pending_acknowledgment')}
                disabled={submitting}
                className="btn-brutal-primary flex items-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit for Acknowledgment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportDetailView({
  report,
  followUps,
  onBack,
  onUpdate,
  canManage
}: {
  report: EmployeeReport;
  followUps: ReportFollowUp[];
  onBack: () => void;
  onUpdate: () => void;
  canManage: boolean;
}) {
  const { profile } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [showAcknowledge, setShowAcknowledge] = useState(false);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [signature, setSignature] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const config = REPORT_TYPE_CONFIG[report.report_type];
  const statusConfig = STATUS_CONFIG[report.status];

  const handleAcknowledge = async () => {
    if (!signature || !acknowledged || !profile) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('employee_reports')
      .update({
        status: 'acknowledged',
        acknowledgment_signature: signature,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: profile.full_name
      })
      .eq('id', report.id);

    if (!error) {
      onUpdate();
      setShowAcknowledge(false);
    }
    setSubmitting(false);
  };

  const handleAddFollowUp = async () => {
    if (!followUpNote || !profile) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('report_follow_ups')
      .insert({
        report_id: report.id,
        note: followUpNote,
        follow_up_type: 'note',
        created_by: profile.id
      });

    if (!error) {
      setFollowUpNote('');
      setShowAddFollowUp(false);
      onUpdate();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (newStatus: ReportStatus) => {
    setSubmitting(true);
    const updates: Partial<EmployeeReport> = { status: newStatus };

    if (newStatus === 'closed') {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = profile?.id;
    }

    const { error } = await supabase
      .from('employee_reports')
      .update(updates)
      .eq('id', report.id);

    if (!error) {
      await supabase.from('report_follow_ups').insert({
        report_id: report.id,
        note: `Status changed to ${STATUS_CONFIG[newStatus].label}`,
        follow_up_type: 'status_change',
        created_by: profile?.id
      });
      onUpdate();
    }
    setSubmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const canAcknowledge = !canManage && report.status === 'pending_acknowledgment' && profile?.email === report.employee_email;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8 print:hidden">
        <button
          onClick={onBack}
          className="p-2 border-3 border-brutal-black bg-brutal-white hover:bg-brutal-gray transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 flex-grow">
          <div className={`w-12 h-12 ${config.color} border-3 border-brutal-black flex items-center justify-center`}>
            <config.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{config.label}</h1>
            <p className="text-sm text-gray-600 font-medium">{report.employee_name}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="btn-brutal flex items-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print
        </button>
      </div>

      <div ref={printRef} className="space-y-6">
        <div className="card-brutal print:border-0 print:shadow-none">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-3 border-brutal-black print:border-b print:border-gray-300">
            <div>
              <h2 className="text-xl font-bold">{config.label}</h2>
              <p className="text-gray-600">Report ID: {report.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className={`px-4 py-2 ${statusConfig.color} text-white font-bold border-2 border-brutal-black`}>
              {statusConfig.label}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Employee</label>
              <p className="font-bold">{report.employee_name}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Incident Date</label>
              <p className="font-medium">{new Date(report.incident_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Severity</label>
              <span className={`px-2 py-0.5 font-bold uppercase text-sm ${
                report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {report.severity}
              </span>
            </div>
            {report.due_date && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Due Date</label>
                <p className="font-medium">{new Date(report.due_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">Description</label>
            <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.description}</p>
          </div>

          {report.report_type === 'capa' && (
            <>
              {report.root_cause && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Root Cause Analysis</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.root_cause}</p>
                </div>
              )}
              {report.corrective_action && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Corrective Action</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.corrective_action}</p>
                </div>
              )}
              {report.preventive_measures && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Preventive Measures</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.preventive_measures}</p>
                </div>
              )}
            </>
          )}

          {(report.report_type === 'written_warning' || report.report_type === 'verbal_warning') && (
            <>
              {report.policy_reference && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Policy Reference</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.policy_reference}</p>
                </div>
              )}
              {report.previous_warnings && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Previous Warnings</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.previous_warnings}</p>
                </div>
              )}
              {report.expected_behavior && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Expected Behavior</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.expected_behavior}</p>
                </div>
              )}
              {report.consequences && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Consequences</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.consequences}</p>
                </div>
              )}
            </>
          )}

          {report.report_type === 'performance_improvement' && (
            <>
              {report.goals && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Performance Goals</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.goals}</p>
                </div>
              )}
              {report.metrics && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Success Metrics</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.metrics}</p>
                </div>
              )}
              {report.support_provided && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Support Provided</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.support_provided}</p>
                </div>
              )}
            </>
          )}

          {report.report_type === 'recognition' && (
            <>
              {report.achievement_description && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Achievement</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.achievement_description}</p>
                </div>
              )}
              {report.impact_statement && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Impact Statement</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.impact_statement}</p>
                </div>
              )}
              {report.recommendation && (
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">Recommendation</label>
                  <p className="p-4 bg-brutal-gray border-2 border-brutal-black">{report.recommendation}</p>
                </div>
              )}
            </>
          )}

          {(report.witness_name || report.witness_title) && (
            <div className="mb-6 grid grid-cols-2 gap-4">
              {report.witness_name && (
                <div>
                  <label className="block text-sm font-bold mb-2">Witness Name</label>
                  <p className="font-medium">{report.witness_name}</p>
                </div>
              )}
              {report.witness_title && (
                <div>
                  <label className="block text-sm font-bold mb-2">Witness Title</label>
                  <p className="font-medium">{report.witness_title}</p>
                </div>
              )}
            </div>
          )}

          {report.acknowledgment_signature && (
            <div className="mt-8 pt-6 border-t-3 border-brutal-black">
              <h3 className="font-bold mb-4">Employee Acknowledgment</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">Digital Signature</label>
                  <div className="p-4 bg-brutal-gray border-2 border-brutal-black font-signature text-2xl italic">
                    {report.acknowledgment_signature}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">Acknowledged By</label>
                  <p className="font-medium">{report.acknowledged_by}</p>
                  <p className="text-sm text-gray-500">
                    {report.acknowledged_at && new Date(report.acknowledged_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {canManage && (
          <div className="card-brutal print:hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Follow-up History
              </h3>
              <button
                onClick={() => setShowAddFollowUp(true)}
                className="btn-brutal text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            </div>

            {showAddFollowUp && (
              <div className="mb-4 p-4 bg-brutal-gray border-2 border-brutal-black">
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  className="input-brutal mb-3"
                  placeholder="Add follow-up note..."
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowAddFollowUp(false)}
                    className="btn-brutal text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFollowUp}
                    disabled={!followUpNote || submitting}
                    className="btn-brutal-primary text-sm"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            )}

            {followUps.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No follow-up notes yet</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="p-3 bg-brutal-gray border-2 border-brutal-black">
                    <p className="mb-2">{fu.note}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(fu.created_at).toLocaleString()} - {fu.follow_up_type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canManage && report.status !== 'closed' && (
          <div className="card-brutal print:hidden">
            <h3 className="font-bold mb-4">Update Status</h3>
            <div className="flex flex-wrap gap-3">
              {report.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('pending_acknowledgment')}
                  disabled={submitting}
                  className="btn-brutal flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Send for Acknowledgment
                </button>
              )}
              {report.status === 'acknowledged' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={submitting}
                  className="btn-brutal flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Mark In Progress
                </button>
              )}
              {report.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('pending_verification')}
                  disabled={submitting}
                  className="btn-brutal flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Ready for Verification
                </button>
              )}
              {(report.status === 'pending_verification' || report.status === 'acknowledged' || report.status === 'in_progress') && (
                <button
                  onClick={() => handleStatusChange('closed')}
                  disabled={submitting}
                  className="btn-brutal-primary flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Close Report
                </button>
              )}
            </div>
          </div>
        )}

        {canAcknowledge && (
          <div className="card-brutal bg-amber-50 print:hidden">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div className="flex-grow">
                <h3 className="font-bold text-amber-800 mb-2">Action Required: Acknowledgment</h3>
                <p className="text-amber-700 mb-4">
                  Please review this document and provide your acknowledgment signature below.
                </p>
                <button
                  onClick={() => setShowAcknowledge(true)}
                  className="btn-brutal-primary"
                >
                  Acknowledge Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAcknowledge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-brutal max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Acknowledge Document</h2>
              <button
                onClick={() => setShowAcknowledge(false)}
                className="p-2 hover:bg-brutal-gray"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-brutal-gray border-2 border-brutal-black">
                <p className="text-sm">
                  By signing below, I acknowledge that I have received and read this {config.label.toLowerCase()}.
                  I understand the contents and my responsibilities as outlined in this document.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Your Signature (type your full name)</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="input-brutal font-signature text-xl italic"
                  placeholder="Type your full name"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="w-5 h-5 mt-0.5"
                />
                <span className="text-sm">
                  I confirm that I have read and understand this document and acknowledge receipt.
                </span>
              </label>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowAcknowledge(false)}
                  className="btn-brutal flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcknowledge}
                  disabled={!signature || !acknowledged || submitting}
                  className="btn-brutal-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Sign & Acknowledge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
