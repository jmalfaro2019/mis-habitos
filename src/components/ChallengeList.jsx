import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { Trophy, Users, Plus, ArrowRight, Calendar, Hash } from 'lucide-react';
import { Button } from './BaseUI';
import CreateChallengeModal from './CreateChallengeModal';

export default function ChallengeList({ db, user, onSelectChallenge }) {
  const [challenges, setChallenges] = useState([]);
  const [creators, setCreators] = useState({}); // Map of uid -> userData
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChallenges(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [db]);

  // Fetch creator profiles
  useEffect(() => {
    const fetchCreators = async () => {
      const creatorIds = [...new Set(challenges.map(c => c.createdBy).filter(Boolean))];
      const newCreators = { ...creators };
      let hasChanges = false;

      for (const uid of creatorIds) {
        if (!newCreators[uid]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              newCreators[uid] = userDoc.data();
              hasChanges = true;
            }
          } catch (error) {
            console.error(`Error fetching creator ${uid}:`, error);
          }
        }
      }

      if (hasChanges) {
        setCreators(newCreators);
      }
    };

    if (challenges.length > 0) {
      fetchCreators();
    }
  }, [challenges, db]);

  const handleJoin = async (challenge) => {
    if (!user) return;
    try {
      // 1. Add user to participants
      await updateDoc(doc(db, 'challenges', challenge.id), {
        participants: arrayUnion(user.uid)
      });

      // 2. Initialize progress for the user
      // Helper to get current period key (duplicated from hook for now)
      const getPeriodKey = (frequencyType) => {
        const now = new Date();
        if (frequencyType === 'MONTHLY') {
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        // Weekly
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${weekNo}`;
      };

      const periodKey = getPeriodKey(challenge.frequency?.type || 'WEEKLY');

      await setDoc(doc(db, 'challenge_progress', `${challenge.id}_${user.uid}`), {
        challengeId: challenge.id,
        userId: user.uid,
        periods: {
          [periodKey]: { count: 0, completed: false }
        },
        lastCheckIn: null
      });

      // Navigate to detail
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
            const freqType = challenge.frequency?.type === 'DAILY' ? 'Diario' : challenge.frequency?.type === 'WEEKLY' ? 'Semanal' : 'Mensual';
            const freqTarget = challenge.frequency?.target || 1;
            const creator = creators[challenge.createdBy];

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

                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                    <Calendar size={12} />
                    {freqType}
                  </div>
                  {challenge.frequency?.type !== 'DAILY' && (
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                      <Hash size={12} />
                      {freqTarget} veces
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 font-bold">
                      {creator?.photoURL ? (
                        <img src={creator.photoURL} alt={challenge.creatorName} className="w-full h-full object-cover" />
                      ) : (
                        (challenge.creatorName || '?')[0].toUpperCase()
                      )}
                    </div>
                    <span>Creado por <span className="font-medium text-slate-600">{challenge.creatorName}</span></span>
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
