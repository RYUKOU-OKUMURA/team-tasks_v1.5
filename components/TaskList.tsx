import React from 'react';
import { Task, User, TaskStatus, TaskPriority } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  allTasks: Task[];
  currentUser: User;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask: (details: { text: string; assigneeEmail: string; priority: TaskPriority, parentTaskId?: string }) => Promise<{ ok: boolean; message: string }>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, allTasks, currentUser, onStatusChange, onAddTask, onEdit, onDelete }) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold text-slate-700">タスクがありません</h3>
        <p className="text-slate-500 mt-2">表示するタスクは現在ありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          allTasks={allTasks}
          currentUser={currentUser}
          onStatusChange={onStatusChange}
          onAddTask={onAddTask}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;