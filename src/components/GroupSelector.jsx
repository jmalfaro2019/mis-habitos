import React, { useState } from 'react';
import { Button, Input } from './BaseUI.jsx'; // Ruta actualizada

export default function GroupSelector({ user, onCreateGroup, onJoinGroup, onLogout }) {
  const [tempCode, setTempCode] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Elige tu Espacio</h2>
          <p className="text-slate-500 mt-2">Bienvenido, {user?.email}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
          <h3 className="font-semibold text-lg">¿Nuevo comienzo?</h3>
          <p className="text-sm text-slate-400">Crea un código nuevo para compartir con tu pareja.</p>
          <Button onClick={onCreateGroup}>Crear Nuevo Grupo</Button>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">O</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
          <h3 className="font-semibold text-lg">¿Ya tienes código?</h3>
          <Input 
            value={tempCode} 
            onChange={e => setTempCode(e.target.value)} 
            placeholder="Ingresa el código aquí"
            className="text-center uppercase font-mono tracking-widest"
          />
          <Button onClick={() => onJoinGroup(tempCode)} variant="secondary" disabled={!tempCode.trim()}>
            Unirse al Grupo
          </Button>
        </div>
        
        <div className="text-center">
           <Button variant="ghost" onClick={onLogout} className="text-sm">Cerrar Sesión</Button>
        </div>
      </div>
    </div>
  );
}