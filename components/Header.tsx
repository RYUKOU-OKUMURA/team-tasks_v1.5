import React from 'react';
import { User } from '../types';

interface HeaderProps {
  users: User[];
  currentUser: User;
  onUserChange: (email: string) => void;
}

const Header: React.FC<HeaderProps> = ({ users, currentUser, onUserChange }) => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Team Tasks</h1>
          </div>
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline text-sm text-slate-500">ログインユーザー:</span>
            <select
              value={currentUser.email}
              onChange={(e) => onUserChange(e.target.value)}
              className="p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {users.map(user => (
                <option key={user.email} value={user.email}>
                  {user.displayName} ({user.role === 'ADMIN' ? '管理者' : '社員'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;