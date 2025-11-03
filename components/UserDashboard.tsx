import React, { useState, useMemo } from 'react';
import { Task, User, TaskStatus, TaskPriority } from '../types';
import { isOverdue } from '../utils/dateUtils';
import TaskItem from './TaskItem';

interface UserDashboardProps {
  tasks: Task[]; // These are pre-filtered parent tasks for the current user
  allTasks: Task[];
  currentUser: User;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask: (details: { text: string; assigneeEmail: string; priority: TaskPriority, parentTaskId?: string }) => Promise<{ ok: boolean; message: string }>;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ tasks, allTasks, currentUser, onStatusChange, onAddTask }) => {
  const [showCompleted, setShowCompleted] = useState(false);

  const { todoTasks, reportedTasks, doneTasks, overdueCount } = useMemo(() => {
    const todo: Task[] = [];
    const reported: Task[] = [];
    const done: Task[] = [];
    let overdue = 0;

    tasks.forEach(task => {
      if (isOverdue(task.dueDate) && task.status !== TaskStatus.DONE) {
        overdue++;
      }
      switch (task.status) {
        case TaskStatus.TODO:
          todo.push(task);
          break;
        case TaskStatus.REPORTED:
          reported.push(task);
          break;
        case TaskStatus.DONE:
          done.push(task);
          break;
      }
    });
    
    // Find completed tasks that are not in the main list
     allTasks.forEach(task => {
        if (task.assigneeEmail === currentUser.email && task.status === TaskStatus.DONE && !task.parentTaskId) {
            if (!done.find(d => d.id === task.id)) {
                done.push(task);
            }
        }
     });


    return { todoTasks: todo, reportedTasks: reported, doneTasks: done, overdueCount: overdue };
  }, [tasks, allTasks, currentUser.email]);

  const totalIncomplete = todoTasks.length + reportedTasks.length;

  const renderTaskList = (tasksToRender: Task[]) => {
      return tasksToRender.map(task => 
        <TaskItem 
            key={task.id} 
            task={task} 
            allTasks={allTasks}
            currentUser={currentUser} 
            onStatusChange={onStatusChange}
            onAddTask={onAddTask}
        />)
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {currentUser.displayName}さんのダッシュボード
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-600">
          <span>未完了タスク: <span className="font-bold text-blue-600 text-lg">{totalIncomplete}</span> 件</span>
          <span>期限切れ: <span className={`font-bold text-lg ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{overdueCount}</span> 件</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border-t-4 border-blue-500">
          <h3 className="font-semibold text-lg text-slate-700 mb-4">
            未着手 ({todoTasks.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {todoTasks.length > 0 ? (
              renderTaskList(todoTasks)
            ) : (
              <p className="text-slate-500 text-sm p-4 text-center">未着手のタスクはありません。</p>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border-t-4 border-purple-500">
          <h3 className="font-semibold text-lg text-slate-700 mb-4">
            報告済み ({reportedTasks.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reportedTasks.length > 0 ? (
              renderTaskList(reportedTasks)
            ) : (
              <p className="text-slate-500 text-sm p-4 text-center">報告済みのタスクはありません。</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2 text-sm cursor-pointer p-2">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>完了済みのタスクを表示する ({doneTasks.length})</span>
        </label>
        {showCompleted && (
          <div className="mt-2 bg-white p-4 rounded-lg shadow-sm space-y-4 border-t-4 border-gray-400">
             <h3 className="font-semibold text-lg text-slate-700">
                完了済み ({doneTasks.length})
             </h3>
            {doneTasks.length > 0 ? (
                renderTaskList(doneTasks)
            ) : (
                <p className="text-slate-500 text-sm text-center">完了済みのタスクはありません。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;