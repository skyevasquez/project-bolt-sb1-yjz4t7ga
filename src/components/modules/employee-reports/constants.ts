import {
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Award,
  AlertCircle
} from 'lucide-react';
import { ReportType, ReportCategory, ReportStatus } from '../../../lib/supabase';

export const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; category: ReportCategory; icon: typeof FileText; color: string }> = {
  capa: { label: 'CAPA Report', category: 'corrective', icon: ClipboardCheck, color: 'bg-blue-600' },
  written_warning: { label: 'Written Warning', category: 'disciplinary', icon: AlertTriangle, color: 'bg-red-600' },
  verbal_warning: { label: 'Verbal Warning', category: 'disciplinary', icon: AlertCircle, color: 'bg-orange-500' },
  recognition: { label: 'Recognition', category: 'commendation', icon: Award, color: 'bg-green-600' },
  performance_improvement: { label: 'Performance Improvement Plan', category: 'corrective', icon: FileText, color: 'bg-amber-600' }
};

export const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-500' },
  pending_acknowledgment: { label: 'Pending Acknowledgment', color: 'bg-amber-500' },
  acknowledged: { label: 'Acknowledged', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-cyan-500' },
  pending_verification: { label: 'Pending Verification', color: 'bg-purple-500' },
  closed: { label: 'Closed', color: 'bg-green-600' }
};
