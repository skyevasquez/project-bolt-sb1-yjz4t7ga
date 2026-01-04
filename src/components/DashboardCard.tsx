import { LucideIcon, ArrowRight, AlertTriangle } from 'lucide-react';

export interface DashboardBadge {
  label: string;
  className: string;
}

export interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  headerColor: string;
  iconColor: string;
  titleColor?: string;
  badges: DashboardBadge[];
  highPriority?: boolean;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  onClick,
  headerColor,
  iconColor,
  titleColor = 'text-white',
  badges,
  highPriority = false
}: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      className="card-brutal p-0 text-left hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover hover:-translate-x-1 hover:-translate-y-1 transition-all duration-150 overflow-hidden group relative w-full"
    >
      {highPriority && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500 border-2 border-brutal-black dark:border-brutal-dark-border text-white text-xs font-bold">
            <AlertTriangle className="w-3 h-3" />
            HIGH PRIORITY
          </div>
        </div>
      )}
      <div className={`${headerColor} p-6 border-b-4 border-brutal-black dark:border-brutal-dark-border`}>
        <div className="flex items-start justify-between">
          <div className="w-16 h-16 bg-brutal-white border-3 border-brutal-black flex items-center justify-center">
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
          <ArrowRight className={`w-6 h-6 ${titleColor === 'text-brutal-black' ? 'text-brutal-black' : 'text-white'} opacity-0 group-hover:opacity-100 transition-opacity`} />
        </div>
        <h2 className={`text-2xl font-bold ${titleColor} mt-4`}>{title}</h2>
      </div>
      <div className="p-6">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
          {description}
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span key={index} className={`badge-brutal ${badge.className}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
