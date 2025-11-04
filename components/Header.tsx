import React from 'react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User;
}

const Header: React.FC<HeaderProps> = ({ currentUser }) => {
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
            <span className="text-sm font-medium text-slate-700">
              {currentUser.displayName} ({currentUser.role === 'ADMIN' ? '管理者' : '社員'})
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;