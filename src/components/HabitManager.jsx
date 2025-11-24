import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { Heart, Plus, Share2, Users, LogOut } from 'lucide-react';
import { Button, Input } from './BaseUI.jsx'; // Ruta actualizada
import HabitCard from './HabitCard.jsx';

export default function HabitManager({ db, user, groupCode, onLeaveGroup, onLogout }) {
  const [habits, setHabits] = useState([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [activeTab, setActiveTab] = useState('me');

  // --- LÓGICA FIREBASE ---
  useEffect(() => {
    if (!user || !groupCode) return;

    const habitsRef = collection(db, 'habitos');
    
    const unsubscribe = onSnapshot(habitsRef, (snapshot) => {
      const allHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const groupHabits = allHabits.filter(h => h.groupId === groupCode);
      setHabits(groupHabits);
    }, (error) => {
      console.error("Error:", error);
    });

    return () => unsubscribe();
  }, [user, groupCode, db]);

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'habitos'), {
        title: newHabitTitle,
        groupId: groupCode,
        userId: user.uid,
        userName: user.email.split('@')[0],
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

  // --- FILTROS Y RENDERIZADO ---
  const myHabits = habits.filter(h => h.userId === user?.uid);
  const partnerHabits = habits.filter(h => h.userId !== user?.uid);

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
            <button onClick={onLeaveGroup} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Salir del grupo">
              <Users size={20} />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Cerrar Sesión">
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
            <HabitCard 
                key={habit.id} 
                habit={habit} 
                onToggle={() => toggleHabit(habit)}
                onDelete={() => deleteHabit(habit.id)}
                isOwner={habit.userId === user?.uid}
            />
          ))}
          {(activeTab === 'me' ? myHabits : partnerHabits).length === 0 && (
            <p className="text-center text-slate-400 py-8">No hay hábitos aquí todavía.</p>
          )}
        </div>
      </main>
    </div>
  );
}