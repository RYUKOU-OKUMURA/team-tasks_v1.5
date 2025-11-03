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
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="サブタスクを追加..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                autoFocus
            />
            <button type="submit" className="text-gray-600 text-sm font-medium hover:text-gray-700 disabled:text-gray-400" disabled={!text.trim()}>
                追加
            </button>
        </form>
    );
};

const SubtaskItem: React.FC<{
    subtask: Task;
    onToggle: (taskId: string) => void;
}> = ({ subtask, onToggle }) => {
    const isCompleted = subtask.status === TaskStatus.DONE;

    return (
        <div className="flex items-center gap-3 py-1.5">
            <button
                onClick={() => onToggle(subtask.id)}
                className="flex-shrink-0 w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center transition-colors hover:border-gray-400"
                aria-label={isCompleted ? '未完了にする' : '完了にする'}
            >
                {isCompleted && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )}
            </button>
            <span className={`text-sm text-black flex-grow ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                {subtask.title}
            </span>
        </div>
    );
};


const priorityStyles: { [key in TaskPriority]: string } = {
  [TaskPriority.HIGH]: 'bg-red-500 text-white',
  [TaskPriority.MEDIUM]: 'bg-yellow-500 text-white',
  [TaskPriority.LOW]: 'bg-green-500 text-white',
};

const priorityText: { [key in TaskPriority]: string } = {
  [TaskPriority.HIGH]: '高',
  [TaskPriority.MEDIUM]: '中',
  [TaskPriority.LOW]: '低',
};

const statusStyles: { [key in TaskStatus]: string } = {
    [TaskStatus.TODO]: 'border-l-blue-500',
    [TaskStatus.REPORTED]: 'border-l-purple-500',
    [TaskStatus.DONE]: 'border-l-gray-400 opacity-70 hover:opacity-100',
};


const TaskItem: React.FC<TaskItemProps> = ({ task, allTasks, currentUser, onStatusChange, onAddTask, onEdit, onDelete, isSubtask = false }) => {
  const [copied, setCopied] = useState(false);
  const [isSubtaskExpanded, setIsSubtaskExpanded] = useState(false);
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
        assigneeEmail: task.assigneeEmail,
        priority: task.priority,
        parentTaskId: task.id,
    });
    setShowAddSubtask(false);
    setIsSubtaskExpanded(true);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const subtask = subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      const newStatus = subtask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      onStatusChange(subtaskId, newStatus);
    }
  };

  const renderUserActions = () => {
    if (currentUser.role === UserRole.USER && currentUser.email === task.assigneeEmail) {
      if (task.status === TaskStatus.TODO) {
        return (
          <button
            onClick={() => onStatusChange(task.id, TaskStatus.REPORTED)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
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
        <>
          {task.status === TaskStatus.REPORTED && (
            <>
              <button
                onClick={() => onStatusChange(task.id, TaskStatus.DONE)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                承認する
              </button>
              <button
                onClick={() => onStatusChange(task.id, TaskStatus.TODO)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M9.707 5.707a1 1 0 00-1.414 0L4 10l4.293 4.293a1 1 0 001.414-1.414L7.414 10l2.293-2.293a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                差し戻す
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(generateGoogleCalendarUrl(task), '_blank')} className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 transition flex items-center justify-center" aria-label="Google Calendar に追加">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="relative">
              <button onClick={handleShareToChat} className="w-10 h-10 rounded-full bg-green-100 hover:bg-green-200 transition flex items-center justify-center" title="Googleチャットで共有">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
              </button>
              {copied && <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">内容をコピーしました</span>}
            </div>
            <button onClick={() => onEdit?.(task)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center" aria-label="編集">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={() => onDelete?.(task.id)} className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 transition flex items-center justify-center" aria-label="削除">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </>
      );
    }
    return null;
  };

  // サブタスクの場合は通常のタスクカード表示を使用しない
  if (isSubtask) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 mb-4`}>
      <div className={`bg-white rounded-lg shadow-md border-l-4 p-5 transition-all duration-200 hover:shadow-lg ${statusStyles[task.status]}`}>
        {/* メインコンテンツエリア */}
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* タスク情報 */}
          <div className="flex-grow">
            <h4 className={`text-lg font-bold text-black mb-2 ${task.status === TaskStatus.DONE ? 'line-through text-slate-500' : ''}`}>
              {task.title}
            </h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black">
              <span>担当者: {task.assigneeName}</span>
              <span className={`font-semibold ${overdue ? 'text-red-500' : 'text-black'}`}>期日: {formatDate(task.dueDate)}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityStyles[task.priority]}`}>
                {priorityText[task.priority]}
              </span>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
            {renderUserActions()}
            {renderAdminActions()}
          </div>
        </div>

        {/* サブタスクセクション */}
        <div className="border-t border-gray-200 pt-3">
              {/* サブタスクセクションが表示される条件：
                  1. サブタスクが1つ以上存在する場合は全員に表示
                  2. サブタスクが0個でも管理者のみに表示
              */}
              {(subtasks.length > 0 || currentUser.role === UserRole.ADMIN) && (
                <>
                  {/* サブタスク見出しと展開ボタン */}
                  <button
                    onClick={() => setIsSubtaskExpanded(!isSubtaskExpanded)}
                    className="w-full flex items-center justify-between mb-3 py-2 px-2 rounded hover:bg-gray-50 transition text-left"
                  >
                    <span className="text-sm font-medium text-black">
                      サブタスク ({completedSubtasks}/{subtasks.length})
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isSubtaskExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* 展開されたサブタスク */}
                  {isSubtaskExpanded && (
                    <div>
                      {subtasks.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          サブタスクはまだありません。
                        </p>
                      ) : (
                        <div className="space-y-1 mb-2">
                          {subtasks.map(subtask => (
                            <SubtaskItem
                              key={subtask.id}
                              subtask={subtask}
                              onToggle={handleToggleSubtask}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* サブタスク追加フォーム */}
                      {showAddSubtask ? (
                        <AddSubtaskForm parentTask={task} onAdd={handleAddSubtask} onCancel={() => setShowAddSubtask(false)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="サブタスクを追加..."
                            onClick={() => setShowAddSubtask(true)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm cursor-pointer"
                            readOnly
                          />
                          <button
                            onClick={() => setShowAddSubtask(true)}
                            className="text-gray-600 text-sm font-medium hover:text-gray-700"
                          >
                            追加
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 折りたたまれている時の表示 */}
                  {!isSubtaskExpanded && subtasks.length === 0 && (
                    <p className="text-sm text-gray-500 py-1">
                      サブタスクはまだありません。
                    </p>
                  )}
                </>
              )}
            </div>
      </div>
    </div>
  );
};

export default TaskItem;