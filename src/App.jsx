import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Importamos nuestros nuevos componentes modulares
// ¡IMPORTANTE: Fíjate en las extensiones .jsx!
import LoginRegister from './components/LoginRegister.jsx';
import GroupSelector from './components/GroupSelector.jsx';
import HabitManager from './components/HabitManager.jsx';

// --- CONFIGURACIÓN DE FIREBASE (Tu código exacto) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('loading'); 
  const [groupCode, setGroupCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Manejo de Sesión
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const savedGroup = localStorage.getItem('myGroupCode');
        if (savedGroup) {
          setGroupCode(savedGroup);
          setView('dashboard');
        } else {
          setView('group_select');
        }
      } else {
        setUser(null);
        setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // --- FUNCIONES DE ALTO NIVEL ---

  const handleLogin = async (email, password) => {
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al entrar. Revisa tu correo y contraseña.');
    }
  };

  const handleRegister = async (email, password) => {
    setErrorMsg('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setErrorMsg('Este correo ya está registrado.');
      else if (err.code === 'auth/weak-password') setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      else setErrorMsg('Error al registrarse: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setGroupCode('');
    localStorage.removeItem('myGroupCode');
    setView('login');
  };

  const handleJoinGroup = (code) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setGroupCode(cleanCode);
    localStorage.setItem('myGroupCode', cleanCode);
    setView('dashboard');
  };

  const createGroup = () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    setGroupCode(code);
    localStorage.setItem('myGroupCode', code);
    setView('dashboard');
  };

  const handleLeaveGroup = () => {
    setGroupCode('');
    localStorage.removeItem('myGroupCode');
    setView('group_select');
  };

  // --- RENDERIZADO ---

  if (view === 'loading') return <div className="min-h-screen flex items-center justify-center text-rose-500">Cargando...</div>;

  if (view === 'login' || view === 'register') {
    return (
      <LoginRegister 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        errorMsg={errorMsg} 
        setErrorMsg={setErrorMsg} 
      />
    );
  }

  if (view === 'group_select') {
    return (
      <GroupSelector 
        user={user}
        onCreateGroup={createGroup}
        onJoinGroup={handleJoinGroup}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <HabitManager 
      db={db}
      user={user}
      groupCode={groupCode}
      onLeaveGroup={handleLeaveGroup}
      onLogout={handleLogout}
    />
  );
}