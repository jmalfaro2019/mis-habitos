import React, { useState } from 'react';
import { Target, Plus, LogOut, Users, Heart } from 'lucide-react';
import { Button } from './BaseUI.jsx';
import HabitCard from './HabitCard.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import UserProfile from './UserProfile.jsx';
import SocialModal from './SocialModal.jsx';
import ChallengeList from './ChallengeList.jsx';
import ChallengeDetail from './ChallengeDetail.jsx';
import CoupleSpace from './CoupleSpace.jsx';
import CreateChallengeModal from './CreateChallengeModal.jsx';

// Hooks
import { useHabits } from '../hooks/useHabits';
import { useChallenges } from '../hooks/useChallenges';

export default function HabitManager({ db, user, userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState('me'); // 'me', 'community', 'couple'
  
  // New Hooks
  const { habits, toggleHabit, deleteHabit } = useHabits(db, user);
  const { myChallenges } = useChallenges(db, user);

  // Challenge State
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // Modals State
  const [showProfile, setShowProfile] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [socialTab, setSocialTab] = useState('following');

  // Check if user has a partner
  const hasPartner = !!userProfile?.partnerId;

  const openSocial = (tab) => {
      setSocialTab(tab);
      setShowSocialModal(true);
  };

  // Filter challenges
  const personalChallenges = myChallenges.filter(c => c.participants.length === 1 && c.participants.includes(user.uid));
  const groupChallenges = myChallenges.filter(c => c.participants.length > 1);

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
                    <span className="font-bold text-slate-800">Seguidores</span>
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
                <div className="space-y-8">
                    
                    {/* Create Button */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg mb-1">¿Nuevo objetivo?</h3>
                            <p className="text-indigo-100 text-sm">Crea un hábito personal o un reto grupal.</p>
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Plus size={18} /> Crear
                        </button>
                    </div>

                    {/* 1. Personal Challenges (New System) */}
                    {personalChallenges.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Target className="text-indigo-600" size={20} />
                                Mis Retos Personales
                            </h3>
                            <div className="grid gap-3">
                                {personalChallenges.map(challenge => (
                                    <div 
                                        key={challenge.id} 
                                        onClick={() => { setActiveTab('community'); setSelectedChallengeId(challenge.id); }}
                                        className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-indigo-200 transition-all"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800">{challenge.title}</h4>
                                            <p className="text-xs text-slate-500">
                                                {challenge.frequency?.type === 'DAILY' ? 'Diario' : `${challenge.frequency?.target} veces/${challenge.frequency?.type === 'WEEKLY' ? 'sem' : 'mes'}`}
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold">
                                            Ver Progreso
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 2. Legacy Habits (Simple) */}
                    {habits.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Target className="text-slate-400" size={20} />
                                Hábitos Simples
                            </h3>
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
                            </div>
                        </section>
                    )}

                    {/* 3. Group Challenges */}
                    {groupChallenges.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users className="text-orange-500" size={20} />
                                Retos Grupales
                            </h3>
                            <div className="grid gap-3">
                                {groupChallenges.map(challenge => (
                                    <div 
                                        key={challenge.id} 
                                        onClick={() => { setActiveTab('community'); setSelectedChallengeId(challenge.id); }}
                                        className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-orange-200 transition-all"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800">{challenge.title}</h4>
                                            <p className="text-xs text-slate-500">
                                                {challenge.frequency?.type === 'DAILY' ? 'Diario' : `${challenge.frequency?.target} veces/${challenge.frequency?.type === 'WEEKLY' ? 'sem' : 'mes'}`}
                                            </p>
                                        </div>
                                        <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold">
                                            {challenge.participants.length} Participantes
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
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

      <CreateChallengeModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        db={db}
        user={user}
      />

    </div>
  );
}
