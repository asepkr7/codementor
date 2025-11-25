import React from 'react';
import { AppMode } from '../types';
import { IconTerminal, IconFlow, IconBug, IconPlay } from './Icons';

interface NavBarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.EXPLAIN, label: 'Penjelasan', icon: IconTerminal },
    { mode: AppMode.FLOWCHART, label: 'Diagram Alur', icon: IconFlow },
    { mode: AppMode.DEBUG, label: 'Pencari Bug', icon: IconBug },
    { mode: AppMode.RUN, label: 'Jalankan', icon: IconPlay },
  ];

  return (
    <div className="bg-slate-800 border-t border-slate-700 md:border-t-0 md:border-r md:h-screen md:w-64 md:flex-shrink-0 fixed bottom-0 w-full md:static z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
      <div className="flex md:flex-col justify-around md:justify-start md:p-4 h-16 md:h-full gap-1 md:gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-6 mb-4">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">CM</div>
            <span className="font-bold text-xl tracking-tight text-slate-100">CodeMentor</span>
        </div>
        
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setMode(item.mode)}
            className={`flex flex-col md:flex-row items-center md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200
              ${currentMode === item.mode 
                ? 'text-indigo-400 md:bg-indigo-500/10 md:text-indigo-300' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
          >
            <item.icon size={20} strokeWidth={currentMode === item.mode ? 2.5 : 2} />
            <span className={`text-[10px] md:text-sm font-medium ${currentMode === item.mode ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};