import { useState, useRef } from 'react';
import {
  Printer,
  ArrowLeft,
  MessageSquare,
  Plus,
  Clock,
  Edit3,
  CheckCircle,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase, EmployeeReport, ReportFollowUp, ReportStatus } from '../../../lib/supabase';
import { REPORT_TYPE_CONFIG, STATUS_CONFIG } from './constants';

interface ReportDetailViewProps {
  report: EmployeeReport;
  followUps: ReportFollowUp[];
  onBack: () => void;
  onUpdate: () => void;
  canManage: boolean;
}

export function ReportDetailView({
  report,
  followUps,
  onBack,
  onUpdate,
  canManage
}: ReportDetailViewProps) {
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
