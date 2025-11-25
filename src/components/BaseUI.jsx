import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 shadow-none w-auto inline-flex px-2",
  };
  
  return (
    <button 
      onClick={onClick} 
      type={type} 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Input = ({ value, onChange, placeholder, type = "text", icon: Icon, className = '' }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all bg-slate-50 focus:bg-white`}
    />
  </div>
);

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);