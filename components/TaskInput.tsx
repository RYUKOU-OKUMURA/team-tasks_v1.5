import React, { useState } from 'react';
import { User, TaskPriority, UserRole } from '../types';

interface TaskInputProps {
  onAddTask: (details: { text: string; assigneeEmail: string; priority: TaskPriority }) => Promise<{ ok: boolean; message: string }>;
  users: User[];
  isCreating: boolean;
}

const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, users, isCreating }) => {
  const [text, setText] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>(users.find(u => u.role === UserRole.USER)?.email || '');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isCreating) return;
    
    setFeedback(null);
    const result = await onAddTask({
      text,
      assigneeEmail: selectedAssignee,
      priority: selectedPriority,
    });

    if (result.ok) {
      setFeedback({ type: 'success', message: result.message });
      setText('');
      // Optionally reset assignee and priority to defaults
      // setSelectedAssignee(users.find(u => u.role === UserRole.USER)?.email || '');
      // setSelectedPriority(TaskPriority.MEDIUM);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }

    setTimeout(() => setFeedback(null), 5000);
  };

  const priorityOptions: { label: string, value: TaskPriority }[] = [
    { label: '高', value: TaskPriority.HIGH },
    { label: '中', value: TaskPriority.MEDIUM },
    { label: '低', value: TaskPriority.LOW },
  ];

  const assignableUsers = users.filter(u => u.role === UserRole.USER);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-2">タスク作成</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例: 11月20日までにプレゼン資料の作成をお願いします"
          className="w-full p-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition mb-4 resize-y"
          rows={3}
          disabled={isCreating}
          aria-label="Task description"
        />
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="w-full sm:w-auto">
            <label htmlFor="assignee" className="block text-sm font-medium text-slate-700 mb-1">担当者</label>
            <select
              id="assignee"
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={isCreating || assignableUsers.length === 0}
            >
              {assignableUsers.map(user => (
                <option key={user.email} value={user.email}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-slate-700 mb-1">優先度</label>
            <div className="flex rounded-md border border-slate-300" role="group">
              {priorityOptions.map(({ label, value }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setSelectedPriority(value)}
                  disabled={isCreating}
                  className={`px-4 py-2 text-sm font-medium transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${selectedPriority === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
                    first:rounded-l-md last:rounded-r-md border-l border-slate-300 first:border-l-0
                  `}
                  aria-pressed={selectedPriority === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-grow"></div>

          <button
            type="submit"
            disabled={isCreating || !text.trim() || !selectedAssignee}
            className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCreating && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
       {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
};

export default TaskInput;
