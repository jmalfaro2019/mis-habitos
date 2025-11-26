import React, { useState } from 'react';
import { X, Trophy, Calendar, Hash, UserPlus, Search, Check } from 'lucide-react';
import { Button, Input } from './BaseUI';
import { useChallenges } from '../hooks/useChallenges';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function CreateChallengeModal({ isOpen, onClose, db, user }) {
  if (!isOpen) return null;

  const { createChallenge } = useChallenges(db, user);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequencyType, setFrequencyType] = useState('WEEKLY'); // DAILY, WEEKLY, MONTHLY
  const [frequencyTarget, setFrequencyTarget] = useState(3);
  const [loading, setLoading] = useState(false);
  
  // Invitation State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Simple search by email for now
      const q = query(
        collection(db, 'users'), 
        where('email', '>=', searchQuery), 
        where('email', '<=', searchQuery + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user.uid); // Exclude self
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleInvite = (u) => {
    if (invitedUsers.find(i => i.id === u.id)) {
      setInvitedUsers(invitedUsers.filter(i => i.id !== u.id));
    } else {
      setInvitedUsers([...invitedUsers, u]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const participantIds = invitedUsers.map(u => u.id);
      // If no invites, it's effectively a personal challenge (but stored as a challenge)
      
      await createChallenge({
        title: title.trim(),
        description: description.trim(),
        type: participantIds.length > 0 ? 'GROUP' : 'PERSONAL', 
        frequency: {
          type: frequencyType,
          target: frequencyTarget
        },
        participants: participantIds // Hook adds current user automatically
      });

      onClose();
      setTitle('');
      setDescription('');
      setFrequencyTarget(3);
      setInvitedUsers([]);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error("Error creating challenge:", error);
      alert("Error al crear el reto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50 shrink-0">
          <h2 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
            <Trophy size={20} className="text-indigo-600" />
            Nuevo Reto / Hábito
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-indigo-100 rounded-full text-indigo-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ej: Leer 30 min, Ir al Gym..." 
              className="font-medium"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Frecuencia
                </label>
                <select 
                    value={frequencyType}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                >
                    <option value="DAILY">Diario</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensual</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Hash size={14} /> Veces
                </label>
                <input 
                    type="number" 
                    min="1" 
                    max={frequencyType === 'DAILY' ? 1 : 31}
                    value={frequencyTarget}
                    onChange={(e) => setFrequencyTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm"
                    disabled={frequencyType === 'DAILY'}
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción (Opcional)</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Reglas del reto..." 
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 min-h-[80px] text-sm"
            />
          </div>

          {/* Invitation Section */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <UserPlus size={16} className="text-indigo-600" />
                Invitar Amigos (Opcional)
            </label>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por email..."
                    className="text-sm"
                />
                <Button type="submit" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
                    <Search size={16} />
                </Button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="mb-3 space-y-2 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded-xl">
                    {searchResults.map(u => {
                        const isSelected = invitedUsers.find(i => i.id === u.id);
                        return (
                            <div key={u.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                                <span className="text-sm truncate max-w-[150px]">{u.email}</span>
                                <button 
                                    type="button"
                                    onClick={() => toggleInvite(u)}
                                    className={`p-1 rounded-full ${isSelected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {isSelected ? <Check size={14} /> : <UserPlus size={14} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Selected Users */}
            {invitedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {invitedUsers.map(u => (
                        <span key={u.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
                            {u.email.split('@')[0]}
                            <button onClick={() => toggleInvite(u)} className="hover:text-indigo-900"><X size={10} /></button>
                        </span>
                    ))}
                </div>
            )}
            {invitedUsers.length === 0 && (
                <p className="text-xs text-slate-400 italic">Si no invitas a nadie, será un reto personal.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <Button onClick={handleCreate} disabled={!title.trim() || loading} className="w-full">
            {loading ? 'Creando...' : invitedUsers.length > 0 ? `Crear Reto Grupal (${invitedUsers.length + 1})` : 'Crear Hábito Personal'}
          </Button>
        </div>

      </div>
    </div>
  );
}
