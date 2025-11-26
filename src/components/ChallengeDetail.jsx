import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { ArrowLeft, Trophy, MessageSquare, Send, CheckCircle, Circle, Calendar, Hash } from 'lucide-react';
import { Button, Input } from './BaseUI';
import { useChallenges } from '../hooks/useChallenges';

export default function ChallengeDetail({ db, user, challengeId, onBack }) {
  const [challenge, setChallenge] = useState(null);
  const [participantsProgress, setParticipantsProgress] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking', 'wall'
  
  const { checkIn } = useChallenges(db, user);

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

  // Load Challenge Info
  useEffect(() => {
    const fetchChallenge = async () => {
        try {
            const docRef = doc(db, 'challenges', challengeId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                // Ensure frequency exists for legacy data
                if (!data.frequency) {
                    data.frequency = { type: 'WEEKLY', target: 1 };
                }
                setChallenge({ id: snap.id, ...data });
            }
        } catch (error) {
            console.error("Error loading challenge:", error);
        }
    };
    fetchChallenge();
  }, [challengeId, db]);

  // Load Participants Progress
  useEffect(() => {
    if (!challenge) return;

    const q = query(collection(db, 'challenge_progress'), where('challengeId', '==', challengeId));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const progressList = snapshot.docs.map(d => d.data());
      
      const progressWithNames = await Promise.all(progressList.map(async (p) => {
          let name = 'Usuario';
          if (p.userId === user.uid) {
              name = 'Tú';
          } else {
              try {
                  const uSnap = await getDoc(doc(db, 'users', p.userId));
                  if (uSnap.exists()) name = uSnap.data().displayName || uSnap.data().email.split('@')[0];
              } catch (e) { console.error(e); }
          }
          return { ...p, name };
      }));

      // Calculate current period progress
      const currentPeriodKey = getPeriodKey(challenge.frequency?.type || 'WEEKLY');
      
      const ranked = progressWithNames.map(p => {
          const periodData = p.periods?.[currentPeriodKey] || { count: 0, completed: false };
          return {
              ...p,
              currentCount: periodData.count,
              isCompleted: periodData.completed,
              totalCheckins: p.checkins?.length || 0
          };
      });
      
      ranked.sort((a, b) => (b.isCompleted === a.isCompleted ? 0 : b.isCompleted ? 1 : -1) || b.currentCount - a.currentCount);
      setParticipantsProgress(ranked);
    });
    return () => unsubscribe();
  }, [challengeId, db, challenge]);

  // Load Wall Posts
  useEffect(() => {
    const q = query(
        collection(db, 'challenge_posts'), 
        where('challengeId', '==', challengeId),
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
        // Suppress index error for MVP, just warn
        if (error.code !== 'failed-precondition') {
            console.error("Error loading posts:", error);
        } else {
            console.warn("Missing index for posts. Create one in Firebase Console.");
        }
    });
    return () => unsubscribe();
  }, [challengeId, db]);

  const handleCheckIn = async () => {
      if (!challenge) return;
      const freq = challenge.frequency || { type: 'WEEKLY', target: 1 };
      const success = await checkIn(challenge.id, freq.type, freq.target);
      if (success) {
          // Optional: Show confetti or success message
      }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await addDoc(collection(db, 'challenge_posts'), {
        challengeId,
        userId: user.uid,
        userName: user.email.split('@')[0],
        content: newPost.trim(),
        createdAt: serverTimestamp()
      });
      setNewPost('');
    } catch (err) { console.error(err); }
  };

  if (!challenge) return <div className="p-8 text-center text-slate-400">Cargando reto...</div>;

  const myProgress = participantsProgress.find(p => p.userId === user.uid);
  const freqTarget = challenge.frequency?.target || 1;
  const freqTypeRaw = challenge.frequency?.type || 'WEEKLY';
  const freqType = freqTypeRaw === 'DAILY' ? 'hoy' : freqTypeRaw === 'WEEKLY' ? 'esta semana' : 'este mes';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 text-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{challenge.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Calendar size={12} /> {freqTypeRaw}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Hash size={12} /> Meta: {freqTarget}
                    </span>
                </div>
            </div>
            
            {/* Big Check-in Button */}
            <div className="text-center">
                <button 
                    onClick={handleCheckIn}
                    disabled={myProgress?.isCompleted}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                        myProgress?.isCompleted 
                        ? 'bg-green-100 text-green-600 cursor-default' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                    }`}
                >
                    {myProgress?.isCompleted ? <CheckCircle size={32} /> : <CheckCircle size={32} />}
                </button>
                <p className="text-xs font-bold text-slate-400 mt-2">
                    {myProgress?.currentCount || 0} / {freqTarget}
                </p>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden">
            <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${myProgress?.isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`} 
                style={{ width: `${Math.min(100, ((myProgress?.currentCount || 0) / freqTarget) * 100)}%` }}
            ></div>
        </div>
        <p className="text-xs text-center text-slate-400 mt-2">
            Has completado {myProgress?.currentCount || 0} de {freqTarget} objetivos {freqType}.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100">
        <button 
          onClick={() => setActiveTab('ranking')} 
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'ranking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
        >
          <Trophy size={16} /> Ranking
        </button>
        <button 
          onClick={() => setActiveTab('wall')} 
          className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'wall' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
        >
          <MessageSquare size={16} /> Muro
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2">
        {activeTab === 'ranking' ? (
          <div className="space-y-3">
            {participantsProgress.map((p, index) => (
              <div key={p.userId} className={`flex items-center justify-between p-4 rounded-xl border ${p.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-bold ${p.userId === user.uid ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {p.name}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        {p.isCompleted ? (
                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10} /> Completado</span>
                        ) : (
                            <span>{p.currentCount} / {freqTarget}</span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-700">{p.totalCheckins}</span>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Post Form */}
            <form onSubmit={handlePost} className="flex gap-2">
              <Input 
                value={newPost} 
                onChange={(e) => setNewPost(e.target.value)} 
                placeholder="Comparte tu progreso..." 
                className="flex-1"
              />
              <button type="submit" disabled={!newPost.trim()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                <Send size={20} />
              </button>
            </form>

            {/* Posts Feed */}
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-slate-700">{post.userName}</span>
                    <span className="text-[10px] text-slate-400">
                        {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Ahora'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">{post.content}</p>
                </div>
              ))}
              {posts.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">Sé el primero en escribir algo.</p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
