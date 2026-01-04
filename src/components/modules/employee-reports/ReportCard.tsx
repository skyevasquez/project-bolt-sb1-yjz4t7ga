import { WifiOff, Clock, Calendar, Eye } from 'lucide-react';
import { EmployeeReport } from '../../../lib/supabase';
import { REPORT_TYPE_CONFIG, STATUS_CONFIG } from './constants';

interface ReportCardProps {
  report: EmployeeReport;
  onClick: () => void;
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const config = REPORT_TYPE_CONFIG[report.report_type];
  const statusConfig = STATUS_CONFIG[report.status];
  const Icon = config.icon;

  const isOverdue = report.follow_up_date && new Date(report.follow_up_date) < new Date() && report.status !== 'closed';

  return (
    <button
      onClick={onClick}
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
}
