import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { X, Trophy } from 'lucide-react';
import { Button, Input } from './BaseUI';

export default function CreateChallengeModal({ isOpen, onClose, db, user }) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      // 1. Create Challenge
      const challengeRef = await addDoc(collection(db, 'challenges'), {
        title: title.trim(),
        description: description.trim(),
        createdBy: user.uid,
        creatorName: user.email.split('@')[0],
        participants: [user.uid],
        createdAt: serverTimestamp()
      });

      // 2. Automatically create the habit for the creator
      await addDoc(collection(db, 'habitos'), {
        title: title.trim(), // Same title as challenge
        userId: user.uid,
        userName: user.email.split('@')[0],
        createdAt: serverTimestamp(),
        completions: [],
        streak: 0,
        challengeId: challengeRef.id // Link to challenge
      });

      onClose();
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error("Error creating challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
          <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
            <Trophy size={20} className="text-indigo-600" />
            Nuevo Reto
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-indigo-100 rounded-full text-indigo-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Título del Reto</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ej: Meditar 10 min diarios" 
              className="font-medium"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Explica de qué trata..." 
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 min-h-[100px] text-sm"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={!title.trim() || loading} className="w-full">
              {loading ? 'Creando...' : 'Lanzar Reto'}
            </Button>
            <p className="text-xs text-center text-slate-400 mt-3">
              Al crear el reto, te unirás automáticamente.
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}
