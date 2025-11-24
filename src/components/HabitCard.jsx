import React from 'react';
import { Check, Trophy, Activity, Trash2 } from 'lucide-react';
import { Card } from './BaseUI.jsx'; // Ruta actualizada

export default function HabitCard({ habit, onToggle, onDelete, isOwner }) {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isDoneToday = habit.completions?.includes(todayStr);

  return (
    <Card className={`transition-all ${isDoneToday ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <button 
          onClick={isOwner ? onToggle : undefined} 
          disabled={!isOwner} 
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isDoneToday ? 'bg-green-500 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-300'}
            ${!isOwner && 'cursor-default opacity-90'}
          `}
        >
          <Check size={18} />
        </button>
        
        <div className="flex-grow">
          <h3 className="font-medium text-slate-700">{habit.title}</h3>
          <div className="flex gap-4 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Trophy size={12} /> {habit.streak} días
            </span>
            {habit.userName && (
                <span className="flex items-center gap-1 text-indigo-400">
                    <Activity size={12} /> {habit.userName}
                </span>
            )}
          </div>
        </div>
        
        {isOwner && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="text-slate-300 hover:text-red-400 p-1 rounded transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </Card>
  );
}