import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Trophy, MessageSquare, Send, Medal } from 'lucide-react';
import { Button, Input } from './BaseUI';

export default function ChallengeDetail({ db, user, challengeId, onBack }) {
  const [challenge, setChallenge] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking', 'wall'

  // Load Challenge Info
  useEffect(() => {
    const fetchChallenge = async () => {
        const docRef = doc(db, 'challenges', challengeId);
        const snap = await getDoc(docRef);
        if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() });
    };
    fetchChallenge();
  }, [challengeId, db]);

  // Load Ranking (Habits with this challengeId)
  useEffect(() => {
    const q = query(collection(db, 'habitos'), where('challengeId', '==', challengeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const habits = snapshot.docs.map(d => d.data());
      // Calculate score based on completions length
      const ranked = habits.map(h => ({
        uid: h.userId,
        name: h.userName,
        score: h.completions?.length || 0,
        streak: h.streak || 0
      }));
      
      // Sort by score desc, then streak desc
      ranked.sort((a, b) => b.score - a.score || b.streak - a.streak);
      setRanking(ranked);
    });
    return () => unsubscribe();
  }, [challengeId, db]);

  // Load Wall Posts
  useEffect(() => {
    const q = query(
        collection(db, 'challenge_posts'), 
        where('challengeId', '==', challengeId),
        orderBy('createdAt', 'desc') // Requires index
    );
    // Fallback if index missing: fetch and sort client side (for MVP safety)
    // For now, let's try simple query without orderBy if it fails, but ideally we want orderBy.
    // We'll assume index exists or will be created.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
        console.warn("Index might be missing for posts. Check console.", error);
    });
    return () => unsubscribe();
  }, [challengeId, db]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 text-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{challenge.title}</h2>
        <p className="text-slate-500">{challenge.description}</p>
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
            {ranking.map((r, index) => (
              <div key={index} className={`flex items-center justify-between p-4 rounded-xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-bold ${index === 0 ? 'text-yellow-800' : 'text-slate-700'}`}>
                        {r.uid === user.uid ? 'Tú' : r.name}
                    </p>
                    <p className="text-xs text-slate-400">Racha actual: {r.streak} días</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-bold ${index === 0 ? 'text-yellow-600' : 'text-indigo-600'}`}>{r.score}</span>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Completados</p>
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
