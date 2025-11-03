import React from 'react';
import { User, TaskPriority, Filter } from '../types';

interface FilterBarProps {
  users: User[];
  filters: Filter;
  onFilterChange: React.Dispatch<React.SetStateAction<Filter>>;
}

const FilterBar: React.FC<FilterBarProps> = ({ users, filters, onFilterChange }) => {
  
  const handleFilter = (key: keyof Filter, value: string | boolean) => {
    onFilterChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
      <h3 className="text-md font-semibold text-slate-600 mr-2">フィルタ:</h3>
      
      <select
        value={filters.assignee}
        onChange={(e) => handleFilter('assignee', e.target.value)}
        className="p-2 bg-white border border-slate-300 rounded-md text-sm"
      >
        <option value="">全担当者</option>
        {users.map(user => (
          <option key={user.email} value={user.email}>{user.displayName}</option>
        ))}
      </select>
      
      <select
        value={filters.priority}
        onChange={(e) => handleFilter('priority', e.target.value)}
        className="p-2 bg-white border border-slate-300 rounded-md text-sm"
      >
        <option value="">全優先度</option>
        {Object.values(TaskPriority).map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      
      <label className="flex items-center space-x-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showOverdue}
          onChange={(e) => handleFilter('showOverdue', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
        />
        <span>遅延のみ</span>
      </label>
    </div>
  );
};

export default FilterBar;