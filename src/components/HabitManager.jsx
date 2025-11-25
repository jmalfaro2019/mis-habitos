import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { Target, Plus, LogOut, User, Users, Heart } from 'lucide-react';
import { Button, Input } from './BaseUI.jsx';
import HabitCard from './HabitCard.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import UserProfile from './UserProfile.jsx';
import SocialModal from './SocialModal.jsx';
import ChallengeList from './ChallengeList.jsx';
import ChallengeDetail from './ChallengeDetail.jsx';
import CoupleSpace from './CoupleSpace.jsx';

export default function HabitManager({ db, user, userProfile, onLogout }) {
  const [habits, setHabits] = useState([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [activeTab, setActiveTab] = useState('me'); // 'me', 'community', 'couple'
  
  // Challenge State
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // Modals State
  const [showProfile, setShowProfile] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [socialTab, setSocialTab] = useState('following');

  // Stats for Header
  const [followersCount, setFollowersCount] = useState(0);

  // Check if user has a partner
  const hasPartner = !!userProfile?.partnerId;

  // --- LÓGICA FIREBASE ---
  useEffect(() => {
    if (!user) return;

    // Fetch Habits (Only mine for now in 'me' tab)
    const habitsRef = collection(db, 'habitos');
    const q = query(habitsRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allHabits.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHabits(allHabits);
    });

    // Fetch Followers Count
    const fetchFollowers = async () => {
        const qFollowers = query(collection(db, 'users'), where('following', 'array-contains', user.uid));
        const snap = await getDocs(qFollowers);
        setFollowersCount(snap.size);
    };
    fetchFollowers();

    return () => unsubscribe();
  }, [user, db]);

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'habitos'), {
        title: newHabitTitle,
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

  const openSocial = (tab) => {
      setSocialTab(tab);
      setShowSocialModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          
          {/* Logo & Profile Trigger */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfile(true)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md overflow-hidden">
               {userProfile?.photoURL ? (
                   <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                   <span className="font-bold text-lg">{(userProfile?.displayName || user.email)[0].toUpperCase()}</span>
               )}
            </div>
            <div className="hidden sm:block">
              <h2 className="font-bold text-sm leading-tight">Hola, {userProfile?.displayName || user.email.split('@')[0]}</h2>
              <p className="text-xs text-slate-400">Ver Perfil</p>
            </div>
          </div>

          {/* Social Stats & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex gap-2 text-xs font-medium text-slate-600">
                <button onClick={() => openSocial('followers')} className="hover:text-indigo-600 transition-colors">
                    <span className="font-bold text-slate-800">{followersCount}</span> Seguidores
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={() => openSocial('following')} className="hover:text-indigo-600 transition-colors">
                    <span className="font-bold text-slate-800">{userProfile?.following?.length || 0}</span> Seguidos
                </button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <NotificationsPanel db={db} user={user} />
            
            <button onClick={onLogout} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors" title="Cerrar Sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100 sticky top-20 z-0">
          <button 
            onClick={() => setActiveTab('me')} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'me' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Target size={18} />
            <span className="hidden sm:inline">Mis Objetivos</span>
          </button>
          <button 
            onClick={() => setActiveTab('community')} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'community' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={18} />
            <span className="hidden sm:inline">Comunidad</span>
          </button>
          {hasPartner && (
            <button 
              onClick={() => setActiveTab('couple')} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'couple' ? 'bg-pink-50 text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Heart size={18} />
              <span className="hidden sm:inline">Pareja</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* TAB: MIS OBJETIVOS */}
            {activeTab === 'me' && (
                <div className="space-y-6">
                    <form onSubmit={addHabit} className="relative group">
                        <Input 
                            value={newHabitTitle} 
                            onChange={(e) => setNewHabitTitle(e.target.value)} 
                            placeholder="¿Qué quieres lograr hoy?" 
                            className="pr-14 shadow-sm border-slate-200 focus:border-indigo-500" 
                        />
                        <button 
                            type="submit" 
                            disabled={!newHabitTitle.trim()} 
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-indigo-200"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="space-y-3">
                        {habits.map(habit => (
                            <HabitCard 
                                key={habit.id} 
                                habit={habit} 
                                onToggle={() => toggleHabit(habit)}
                                onDelete={() => deleteHabit(habit.id)}
                                isOwner={true}
                            />
                        ))}
                        {habits.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Target size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">No tienes objetivos activos.</p>
                                <p className="text-sm text-slate-400">¡Comienza agregando uno arriba!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: COMUNIDAD (Challenges) */}
            {activeTab === 'community' && (
                selectedChallengeId ? (
                    <ChallengeDetail 
                        db={db}
                        user={user}
                        challengeId={selectedChallengeId}
                        onBack={() => setSelectedChallengeId(null)}
                    />
                ) : (
                    <ChallengeList 
                        db={db}
                        user={user}
                        onSelectChallenge={setSelectedChallengeId}
                    />
                )
            )}

            {/* TAB: PAREJA */}
            {activeTab === 'couple' && hasPartner && (
                <CoupleSpace 
                    db={db}
                    user={user}
                    userProfile={userProfile}
                />
            )}

        </div>

      </main>

      {/* Modals */}
      {showProfile && (
          <UserProfile 
            user={user} 
            userProfile={userProfile} 
            db={db} 
            onClose={() => setShowProfile(false)} 
            habits={habits}
          />
      )}

      <SocialModal 
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
        initialTab={socialTab}
        db={db}
        currentUser={user}
        userProfile={userProfile}
      />

    </div>
  );
}