import { useState } from 'react';
import { ArrowLeft, Users, ListChecks, FileStack, Settings } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { SubmissionTypesManagement } from './SubmissionTypesManagement';
import { SubmissionsOverview } from './SubmissionsOverview';

type AdminTab = 'users' | 'types' | 'submissions';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center border-3 border-brutal-black dark:border-brutal-dark-border bg-brutal-white dark:bg-brutal-dark-surface hover:bg-gray-100 dark:hover:bg-brutal-dark-bg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600 border-3 border-brutal-black dark:border-brutal-dark-border flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">System Administration</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b-3 border-brutal-black dark:border-brutal-dark-border pb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 font-bold border-3 border-brutal-black dark:border-brutal-dark-border transition-all ${
            activeTab === 'users'
              ? 'bg-red-600 text-white shadow-brutal-sm dark:shadow-brutal-dark-sm -translate-x-0.5 -translate-y-0.5'
              : 'bg-brutal-white dark:bg-brutal-dark-surface hover:bg-gray-100 dark:hover:bg-brutal-dark-bg'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-2 px-4 py-2 font-bold border-3 border-brutal-black dark:border-brutal-dark-border transition-all ${
            activeTab === 'types'
              ? 'bg-red-600 text-white shadow-brutal-sm dark:shadow-brutal-dark-sm -translate-x-0.5 -translate-y-0.5'
              : 'bg-brutal-white dark:bg-brutal-dark-surface hover:bg-gray-100 dark:hover:bg-brutal-dark-bg'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Submission Types
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2 font-bold border-3 border-brutal-black dark:border-brutal-dark-border transition-all ${
            activeTab === 'submissions'
              ? 'bg-red-600 text-white shadow-brutal-sm dark:shadow-brutal-dark-sm -translate-x-0.5 -translate-y-0.5'
              : 'bg-brutal-white dark:bg-brutal-dark-surface hover:bg-gray-100 dark:hover:bg-brutal-dark-bg'
          }`}
        >
          <FileStack className="w-4 h-4" />
          All Submissions
        </button>
      </div>

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'types' && <SubmissionTypesManagement />}
      {activeTab === 'submissions' && <SubmissionsOverview />}
    </div>
  );
}
