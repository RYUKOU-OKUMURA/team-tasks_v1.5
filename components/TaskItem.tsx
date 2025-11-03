import React, { useState, useMemo } from 'react';
import { Task, User, TaskStatus, UserRole, TaskPriority } from '../types';
import { formatDate, isOverdue, generateGoogleCalendarUrl } from '../utils/dateUtils';

interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  currentUser: User;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask: (details: { text: string; assigneeEmail: string; priority: TaskPriority, parentTaskId?: string }) => Promise<{ ok: boolean; message: string }>;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  isSubtask?: boolean;
}

const AddSubtaskForm: React.FC<{
    parentTask: Task;
    onAdd: (text: string) => void;
    onCancel: () => void;
}> = ({ parentTask, onAdd, onCancel }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="ml-8 mt-2 p-3 bg-slate-50 rounded animate-fade-in-down">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="サブタスクの内容 (例: 11/22までに草案作成)"
                className="w-full p-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-sm"
                rows={2}
                autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-300">
                    キャンセル
                </button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-slate-400" disabled={!text.trim()}>
                    追加
                </button>
            </div>
        </form>
    );
};


const priorityStyles: { [key in TaskPriority]: string } = {
  [TaskPriority.HIGH]: 'bg-red-100 text-red-800 border-red-300',
  [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [TaskPriority.LOW]: 'bg-green-100 text-green-800 border-green-300',
};

const statusStyles: { [key in TaskStatus]: string } = {
    [TaskStatus.TODO]: 'border-l-blue-500',
    [TaskStatus.REPORTED]: 'border-l-purple-500',
    [TaskStatus.DONE]: 'border-l-gray-400 opacity-70 hover:opacity-100',
};


const TaskItem: React.FC<TaskItemProps> = ({ task, allTasks, currentUser, onStatusChange, onAddTask, onEdit, onDelete, isSubtask = false }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const subtasks = useMemo(() => allTasks.filter(st => st.parentTaskId === task.id).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [allTasks, task.id]);
  const completedSubtasks = useMemo(() => subtasks.filter(st => st.status === TaskStatus.DONE).length, [subtasks]);


  const overdue = isOverdue(task.dueDate) && task.status !== TaskStatus.DONE;

  const handleShareToChat = () => {
    const message = `【タスク共有】\nタイトル: ${task.title}\n担当: ${task.assigneeName}\n期日: ${formatDate(task.dueDate)}\n優先度: ${task.priority}\nステータス: ${task.status}`;
    navigator.clipboard.writeText(message).then(() => {
        setCopied(true);
        window.open('https://chat.google.com', '_blank', 'noopener,noreferrer');
        setTimeout(() => setCopied(false), 2500);
    });
  };
  
  const handleAddSubtask = async (text: string) => {
    await onAddTask({
        text,
        assigneeEmail: task.assigneeEmail, // Default to parent's assignee
        priority: task.priority, // Default to parent's priority
        parentTaskId: task.id,
    });
    setShowAddSubtask(false);
    setIsExpanded(true);
  };


  const renderUserActions = () => {
    if (currentUser.role === UserRole.USER && currentUser.email === task.assigneeEmail) {
      if (task.status === TaskStatus.TODO) {
        return (
          <button
            onClick={() => onStatusChange(task.id, TaskStatus.REPORTED)}
            className="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-green-600 transition"
          >
            完了報告
          </button>
        );
      }
      if (task.status === TaskStatus.REPORTED) {
          return <span className="text-sm text-slate-500">承認待ち</span>
      }
    }
    return null;
  };

  const renderAdminActions = () => {
    if (currentUser.role === UserRole.ADMIN) {
      return (
        <div className="flex items-center gap-2">
          {task.status === TaskStatus.REPORTED && (
            <>
              <button
                onClick={() => onStatusChange(task.id, TaskStatus.DONE)}
                className="bg-sky-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-sky-600 transition"
              >
                承認
              </button>
              <button
                onClick={() => onStatusChange(task.id, TaskStatus.TODO)}
                className="bg-slate-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-slate-600 transition"
              >
                差し戻し
              </button>
            </>
          )}
          <button onClick={() => onEdit?.(task)} className="p-1 text-slate-500 hover:text-blue-600 transition" aria-label="Edit Task">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
          </button>
          <button onClick={() => onDelete?.(task.id)} className="p-1 text-slate-500 hover:text-red-600 transition" aria-label="Delete Task">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`transition-all duration-300 ${isSubtask ? 'my-2' : ''}`}>
        <div className={`bg-white rounded-lg shadow-sm border-l-4 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-200 hover:shadow-md ${statusStyles[task.status]}`}>
            <div className="flex-grow flex items-start gap-2">
                {!isSubtask && subtasks.length > 0 && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-slate-400 hover:text-blue-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                 {isSubtask && <div className="w-6"></div>}
                <div>
                    <h4 className={`font-bold text-slate-800 ${task.status === TaskStatus.DONE ? 'line-through text-slate-500' : ''}`}>{task.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                        <span>担当: {task.assigneeName}</span>
                        <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${overdue ? 'text-red-500' : ''}`}>期日: {formatDate(task.dueDate)}</span>
                            <a href={generateGoogleCalendarUrl(task)} target="_blank" rel="noopener noreferrer" title="Google Calendar に追加" className="text-slate-400 hover:text-blue-600 transition-colors duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm3 3a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${priorityStyles[task.priority]}`}>{task.priority}</span>
                        {!isSubtask && subtasks.length > 0 && <span className="text-xs font-mono">({completedSubtasks}/{subtasks.length})</span>}
                    </div>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 self-end sm:self-center">
                {renderUserActions()}
                {renderAdminActions()}
                {!isSubtask && (
                    <button onClick={() => setShowAddSubtask(!showAddSubtask)} className="p-1 text-slate-500 hover:text-blue-600 transition" title="サブタスクを追加">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    </button>
                )}
                 <div className="relative">
                    <button onClick={handleShareToChat} className="p-1 text-slate-500 hover:text-green-600 transition" title="Googleチャットで共有">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {copied && <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">内容をコピーしました</span>}
                </div>
            </div>
        </div>

        {!isSubtask && (
            <>
                {showAddSubtask && <AddSubtaskForm parentTask={task} onAdd={handleAddSubtask} onCancel={() => setShowAddSubtask(false)} />}
                {isExpanded && subtasks.length > 0 && (
                    <div className="pl-6 pt-3 mt-3 border-l-2 border-slate-200 ml-6 space-y-2">
                        {subtasks.map(subtask => (
                            <TaskItem
                                key={subtask.id}
                                task={subtask}
                                allTasks={allTasks}
                                currentUser={currentUser}
                                onStatusChange={onStatusChange}
                                onAddTask={onAddTask}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                isSubtask={true}
                            />
                        ))}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default TaskItem;