import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Users, Plus, ArrowRight } from 'lucide-react';
import { Button } from './BaseUI';
import CreateChallengeModal from './CreateChallengeModal';

export default function ChallengeList({ db, user, onSelectChallenge }) {
  const [challenges, setChallenges] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChallenges(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [db]);

  const handleJoin = async (challenge) => {
    if (!user) return;
    try {
      // 1. Add user to participants
      await updateDoc(doc(db, 'challenges', challenge.id), {
        participants: arrayUnion(user.uid)
      });

      // 2. Create the habit for the user
      await addDoc(collection(db, 'habitos'), {
        title: challenge.title,
        userId: user.uid,
        userName: user.email.split('@')[0],
        createdAt: serverTimestamp(),
        completions: [],
        streak: 0,
        challengeId: challenge.id
      });
      
      // Optional: Navigate to detail or show success
      onSelectChallenge(challenge.id);
    } catch (error) {
      console.error("Error joining challenge:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Retos Disponibles</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Crear Reto
        </button>
      </div>

      <div className="grid gap-4">
        {challenges.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Trophy size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No hay retos activos.</p>
            <p className="text-sm text-slate-400">¡Sé el primero en crear uno!</p>
          </div>
        ) : (
          challenges.map(challenge => {
            const isParticipant = challenge.participants?.includes(user?.uid);
            
            return (
              <div key={challenge.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {challenge.title}
                    </h4>
                    <p className="text-sm text-slate-500 line-clamp-2">{challenge.description}</p>
                  </div>
                  <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <Users size={14} />
                    {challenge.participants?.length || 0}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-slate-400">
                    Creado por <span className="font-medium text-slate-600">{challenge.creatorName}</span>
                  </div>
                  
                  {isParticipant ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => onSelectChallenge(challenge.id)}
                      className="py-2 px-4 text-xs h-auto"
                    >
                      Ver Ranking <ArrowRight size={14} className="ml-1" />
                    </Button>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={() => handleJoin(challenge)}
                      className="py-2 px-4 text-xs h-auto"
                    >
                      Unirse al Reto
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateChallengeModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        db={db}
        user={user}
      />
    </div>
  );
}
