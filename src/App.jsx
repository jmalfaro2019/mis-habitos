import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Importamos nuestros nuevos componentes modulares
// ¡IMPORTANTE: Fíjate en las extensiones .jsx!
import LoginRegister from './components/LoginRegister.jsx';
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
  const [userProfile, setUserProfile] = useState(null); // Datos extendidos del usuario (following, etc.)
  const [view, setView] = useState('loading'); 
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Manejo de Sesión
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Suscribirse a cambios en el perfil del usuario
        const unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            } else {
                // Si no existe (ej. usuario antiguo), crear uno básico
                const newProfile = {
                    uid: u.uid,
                    email: u.email,
                    following: []
                };
                setDoc(doc(db, 'users', u.uid), newProfile);
                setUserProfile(newProfile);
            }
        }, (error) => {
            console.error("Error listening to user profile:", error);
        });

        setView('dashboard');
        
        // Cleanup de la suscripción al perfil cuando cambia el usuario o se desmonta
        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setView('login');
      }
    });
    return () => unsubscribeAuth();
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const u = userCredential.user;
      
      // Crear documento de usuario en Firestore
      const newProfile = {
        uid: u.uid,
        email: u.email,
        following: []
      };
      await setDoc(doc(db, 'users', u.uid), newProfile);
      
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setErrorMsg('Este correo ya está registrado.');
      else if (err.code === 'auth/weak-password') setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      else setErrorMsg('Error al registrarse: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('login');
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

  return (
    <HabitManager 
      db={db}
      user={user}
      userProfile={userProfile}
      onLogout={handleLogout}
    />
  );
}