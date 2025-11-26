import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Edit2, Save, X, Award, Calendar, Camera } from 'lucide-react';
import { Button, Input, Card } from './BaseUI';

export default function UserProfile({ user, userProfile, db, onClose, habits = [], isReadOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  const [loading, setLoading] = useState(false);

  // State for read-only mode stats
  const [viewedUserHabits, setViewedUserHabits] = useState([]);

  // Update local state when prop changes
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setBio(userProfile.bio || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  // Fetch habits for the viewed user if in read-only mode
  useEffect(() => {
    if (isReadOnly && userProfile?.uid && db) {
      // Import dynamically to avoid circular dependencies if any, or just use the logic here
      // We'll just do a direct fetch here for simplicity
      const fetchHabits = async () => {
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'habitos'), where('userId', '==', userProfile.uid));
          const snapshot = await getDocs(q);
          const loadedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setViewedUserHabits(loadedHabits);
        } catch (error) {
          console.error("Error fetching user habits:", error);
        }
      };
      fetchHabits();
    }
  }, [isReadOnly, userProfile, db]);

  // Stats Calculation
  // If read-only, use fetched habits. If not, use passed habits (current user's)
  const targetHabits = isReadOnly ? viewedUserHabits : habits;

  const totalCompleted = targetHabits.reduce((acc, curr) => acc + (curr.completions?.length || 0), 0);
  const bestStreak = targetHabits.reduce((max, curr) => Math.max(max, curr.streak || 0), 0);

  const handleSave = async () => {
    if (!user || isReadOnly) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim() || user.email.split('@')[0],
        bio,
        photoURL
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

        {/* Header with Cover */}
        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500 relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar & Info */}
          <div className="relative -mt-12 mb-4 flex flex-col items-center">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg relative group">
              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} />
                )}
              </div>
              {isEditing && !isReadOnly && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={24} />
                </div>
              )}
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-800">{userProfile?.displayName || userProfile?.email?.split('@')[0] || 'Usuario'}</h2>
            <p className="text-sm text-slate-500">{userProfile?.email}</p>
          </div>

          {/* Edit Form or Bio Display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase">Perfil</h3>
              {!isEditing && !isReadOnly && (
                <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-700 p-1 flex items-center gap-1 text-xs font-bold">
                  <Edit2 size={14} /> EDITAR
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre de Usuario</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Tu nombre"
                    className="text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Foto de Perfil (URL)</label>
                  <Input
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Sobre mí</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 text-sm min-h-[80px]"
                    placeholder="Escribe algo sobre ti..."
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-xs">Cancelar</Button>
                  <Button variant="primary" onClick={handleSave} disabled={loading} className="py-1 px-4 text-xs h-9">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed italic text-center px-4">
                {userProfile?.bio || (isReadOnly ? "Este usuario no ha añadido una descripción." : "Sin descripción aún. ¡Edita tu perfil para añadir una!")}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex flex-col items-center justify-center text-center">
              <Award className="text-indigo-600 mb-1" size={20} />
              <span className="text-2xl font-bold text-indigo-700">{totalCompleted}</span>
              <span className="text-xs text-indigo-600/80 font-medium">Completados</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center">
              <Calendar className="text-purple-600 mb-1" size={20} />
              <span className="text-2xl font-bold text-purple-700">{bestStreak}</span>
              <span className="text-xs text-purple-600/80 font-medium">Mejor Racha</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
