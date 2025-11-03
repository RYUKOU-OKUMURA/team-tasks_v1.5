import React, { useState, useEffect } from 'react';
import { Task, User, TaskPriority } from '../types';

interface TaskModalProps {
  task: Task;
  users: User[];
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, users, onClose, onSave }) => {
  const [formData, setFormData] = useState<Task>(task);

  useEffect(() => {
    setFormData(task);
  }, [task]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const localDate = new Date(e.target.value);
    const isoString = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString();
    setFormData(prev => ({...prev, dueDate: isoString}));
  };
  
  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedUser = users.find(u => u.email === e.target.value);
      if (selectedUser) {
        setFormData(prev => ({
          ...prev,
          assigneeEmail: selectedUser.email,
          assigneeName: selectedUser.displayName,
        }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const dateForInput = new Date(formData.dueDate).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">タスク編集</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">タスク名</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">担当者</label>
            <select name="assigneeEmail" value={formData.assigneeEmail} onChange={handleAssigneeChange} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              {users.map(user => <option key={user.email} value={user.email}>{user.displayName}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">期日</label>
              <input type="date" name="dueDate" value={dateForInput} onChange={handleDateChange} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700">優先度</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full bg-white rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">キャンセル</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;