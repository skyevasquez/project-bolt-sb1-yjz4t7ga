import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { sendNotification } from '../../../lib/notifications';
import { ReportType, ReportSeverity, ReportStatus } from '../../../lib/supabase';
import { REPORT_TYPE_CONFIG } from './constants';

interface ReportCreationFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ReportCreationForm({ onBack, onSuccess }: ReportCreationFormProps) {
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
