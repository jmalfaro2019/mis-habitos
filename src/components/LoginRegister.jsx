import React, { useState } from 'react';
import { Heart, Mail, Lock } from 'lucide-react';
import { Button, Input } from './BaseUI.jsx'; // Ruta actualizada

export default function LoginRegister({ onLogin, onRegister, errorMsg, setErrorMsg }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email, password);
    } else {
      onRegister(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Hábitos en Pareja</h1>
          <p className="text-slate-500">{isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta para empezar'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            type="email" 
            placeholder="Tu correo electrónico" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            icon={Mail}
          />
          <Input 
            type="password" 
            placeholder="Contraseña (min 6 caracteres)" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            icon={Lock}
          />
          
          {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

          <Button type="submit" variant="primary">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setErrorMsg(''); setIsLogin(!isLogin); }}
            className="text-slate-500 hover:text-rose-500 text-sm font-medium transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}