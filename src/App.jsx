import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Heart, Plus, Check, Trophy, Users, Activity, Trash2, Share2, LogOut, Mail, Lock
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
// ¡¡IMPORTANTE!!: Reemplaza esto con TUS credenciales de Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBRx7N3mNQEmGG7B7fW2sG5ntwWHk0TE3U",
  authDomain: "habitos-pareja.firebaseapp.com",
  projectId: "habitos-pareja",
  storageBucket: "habitos-pareja.firebasestorage.app",
  messagingSenderId: "456771119690",
  appId: "1:456771119690:web:9c208c7f3e00391bb014b3",
  measurementId: "G-ZHYZWPE4D4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- COMPONENTES UI ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type="button" }) => {
  const baseStyle = "w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95";
  const variants = {
    primary: "bg-rose-500 text-white hover:bg-rose-600 disabled:bg-rose-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 shadow-none w-auto inline-flex px-2",
  };
  
  return (
    <button onClick={onClick} type={type} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = "text", icon: Icon }) => (
  <div className="relative">
    {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-slate-50 focus:bg-white`}
    />
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

// --- APP PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  
  // Estados de vista
  const [view, setView] = useState('loading'); // 'loading', 'login', 'register', 'group_select', 'dashboard'
  
  // Estados de datos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [tempCode, setTempCode] = useState('');
  const [habits, setHabits] = useState([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [activeTab, setActiveTab] = useState('me');

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

  // 2. Escuchar Hábitos (Solo si hay usuario y grupo)
  useEffect(() => {
    if (!user || !groupCode) return;

    // NOTA: Para producción local simplificada usamos una colección raíz 'habitos'
    const habitsRef = collection(db, 'habitos');
    
    const unsubscribe = onSnapshot(habitsRef, (snapshot) => {
      const allHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const groupHabits = allHabits.filter(h => h.groupId === groupCode);
      setHabits(groupHabits);
    }, (error) => {
      console.error("Error:", error);
    });

    return () => unsubscribe();
  }, [user, groupCode]);

  // --- ACCIONES DE AUTENTICACIÓN ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El onAuthStateChanged manejará el cambio de vista
    } catch (err) {
      setErrorMsg('Error al entrar. Revisa tu correo y contraseña.');
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // El onAuthStateChanged manejará el cambio de vista
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('Este correo ya está registrado.');
      else if (err.code === 'auth/weak-password') setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      else setErrorMsg('Error al registrarse: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setGroupCode('');
    localStorage.removeItem('myGroupCode');
    setEmail('');
    setPassword('');
    setView('login');
  };

  // --- ACCIONES DE GRUPO ---

  const handleJoinGroup = () => {
    if (!tempCode.trim()) return;
    const code = tempCode.trim().toUpperCase();
    setGroupCode(code);
    localStorage.setItem('myGroupCode', code);
    setView('dashboard');
  };

  const createGroup = () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    setGroupCode(code);
    localStorage.setItem('myGroupCode', code);
    setView('dashboard');
  };

  const leaveGroup = () => {
    setGroupCode('');
    localStorage.removeItem('myGroupCode');
    setView('group_select');
    setTempCode('');
  };

  // --- LÓGICA DE HÁBITOS (Igual que antes) ---

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'habitos'), {
        title: newHabitTitle,
        groupId: groupCode,
        userId: user.uid,
        userName: user.email.split('@')[0], // Usamos la primera parte del correo como nombre
        createdAt: serverTimestamp(),
        completions: [],
        streak: 0
      });
      setNewHabitTitle('');
    } catch (err) { console.error(err); }
  };

  const toggleHabit = async (habit) => {
    const today = new Date().toLocaleDateString('en-CA');
    const isCompletedToday = habit.completions.includes(today);
    let newCompletions = isCompletedToday 
      ? habit.completions.filter(d => d !== today)
      : [...habit.completions, today];
    let newStreak = isCompletedToday 
      ? Math.max(0, habit.streak - 1)
      : habit.streak + 1;

    await updateDoc(doc(db, 'habitos', habit.id), {
      completions: newCompletions,
      streak: newStreak
    });
  };

  const deleteHabit = async (id) => {
    if (confirm('¿Eliminar?')) await deleteDoc(doc(db, 'habitos', id));
  };

  // Filtrado
  const myHabits = habits.filter(h => h.userId === user?.uid);
  const partnerHabits = habits.filter(h => h.userId !== user?.uid);

  // --- VISTAS ---

  if (view === 'loading') return <div className="min-h-screen flex items-center justify-center text-rose-500">Cargando...</div>;

  // VISTA 1: LOGIN / REGISTER
  if (view === 'login' || view === 'register') {
    const isLogin = view === 'login';
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

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
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
              onClick={() => { setErrorMsg(''); setView(isLogin ? 'register' : 'login'); }}
              className="text-slate-500 hover:text-rose-500 text-sm font-medium transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA 2: SELECCIÓN DE GRUPO (Solo si estás logueado pero sin grupo)
  if (view === 'group_select') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Elige tu Espacio</h2>
            <p className="text-slate-500 mt-2">Bienvenido, {user.email}</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center space-y-4">
            <h3 className="font-semibold text-lg">¿Nuevo comienzo?</h3>
            <p className="text-sm text-slate-400">Crea un código nuevo para compartir con tu pareja.</p>
            <Button onClick={createGroup}>Crear Nuevo Grupo</Button>
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
            <Button onClick={handleJoinGroup} variant="secondary" disabled={!tempCode}>
              Unirse al Grupo
            </Button>
          </div>
          
          <div className="text-center">
             <Button variant="ghost" onClick={handleLogout} className="text-sm">Cerrar Sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  // VISTA 3: DASHBOARD (Principal)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-500 p-2 rounded-lg text-white">
              <Heart size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Nuestros Hábitos</h2>
              <p className="text-xs text-slate-400 font-mono">Cód: {groupCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              navigator.clipboard.writeText(groupCode).then(() => alert("¡Código copiado!")).catch(() => alert("Copia este código: " + groupCode));
            }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full">
              <Share2 size={20} />
            </button>
            <button onClick={leaveGroup} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Salir del grupo">
              <Users size={20} />
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Cerrar Sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
          <button onClick={() => setActiveTab('me')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'me' ? 'bg-rose-50 text-rose-600' : 'text-slate-500'}`}>
            Míos ({myHabits.length})
          </button>
          <button onClick={() => setActiveTab('partner')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'partner' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
            Pareja ({partnerHabits.length})
          </button>
        </div>

        {activeTab === 'me' && (
          <form onSubmit={addHabit} className="relative group">
            <Input value={newHabitTitle} onChange={(e) => setNewHabitTitle(e.target.value)} placeholder="Nuevo objetivo..." className="pr-12" />
            <button type="submit" disabled={!newHabitTitle.trim()} className="absolute right-2 top-2 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50">
              <Plus size={20} />
            </button>
          </form>
        )}

        <div className="space-y-3">
          {(activeTab === 'me' ? myHabits : partnerHabits).map(habit => (
            <Card key={habit.id} className={habit.completions.includes(new Date().toLocaleDateString('en-CA')) ? 'border-l-4 border-l-green-400' : ''}>
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => isOwner(habit) && toggleHabit(habit)} disabled={!isOwner(habit)} className={`w-8 h-8 rounded-full flex items-center justify-center ${habit.completions.includes(new Date().toLocaleDateString('en-CA')) ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                  <Check size={18} />
                </button>
                <div className="flex-grow">
                  <h3 className="font-medium text-slate-700">{habit.title}</h3>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Trophy size={12} /> {habit.streak} días</span>
                    {activeTab === 'partner' && <span className="text-indigo-400 font-medium">de {habit.userName}</span>}
                  </div>
                </div>
                {isOwner(habit) && <button onClick={() => deleteHabit(habit.id)} className="text-slate-300 hover:text-red-400"><Trash2 size={16} /></button>}
              </div>
            </Card>
          ))}
          {(activeTab === 'me' ? myHabits : partnerHabits).length === 0 && (
            <p className="text-center text-slate-400 py-8">No hay hábitos aquí todavía.</p>
          )}
        </div>
      </main>
    </div>
  );

  function isOwner(habit) { return habit.userId === user?.uid; }
}