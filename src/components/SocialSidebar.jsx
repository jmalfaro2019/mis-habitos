import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Search, UserPlus, UserMinus, Users } from 'lucide-react';
import { Button, Input } from './BaseUI.jsx';

export default function SocialSidebar({ db, currentUser, userProfile }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar detalles de los usuarios seguidos
  useEffect(() => {
    const loadFollowing = async () => {
      if (!userProfile?.following || userProfile.following.length === 0) {
        setFollowingUsers([]);
        return;
      }

      const usersData = [];
      // Firestore no soporta "where in" con más de 10 IDs fácilmente, así que hacemos fetch individual por ahora
      // para simplificar, o usamos chunks. Para MVP, fetch individual está bien.
      for (const uid of userProfile.following) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          usersData.push(userDoc.data());
        }
      }
      setFollowingUsers(usersData);
    };

    loadFollowing();
  }, [userProfile, db]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchTerm.trim()));
      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== currentUser.uid) { // No mostrarse a uno mismo
            results.push(doc.data());
        }
      });
      setSearchResults(results);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (targetUid) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        following: arrayUnion(targetUid)
      });
      
      // Crear notificación para el usuario seguido
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid, // Para quién es la notificación
        type: 'new_follower',
        fromUid: currentUser.uid,
        fromEmail: currentUser.email,
        read: false,
        createdAt: serverTimestamp()
      });

      window.location.reload(); 
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const unfollowUser = async (targetUid) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        following: arrayRemove(targetUid)
      });
      window.location.reload();
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

  const isFollowing = (uid) => userProfile?.following?.includes(uid);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-fit">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Users size={20} className="text-indigo-600" />
        Comunidad
      </h3>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Input 
            placeholder="Buscar por email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 text-sm"
          />
          <button type="submit" className="absolute right-2 top-2 text-slate-400 hover:text-indigo-600">
            <Search size={18} />
          </button>
        </div>
      </form>

      {/* Resultados de Búsqueda */}
      {searchResults.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Resultados</h4>
          <div className="space-y-2">
            {searchResults.map(user => (
              <div key={user.uid} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => isFollowing(user.uid) ? unfollowUser(user.uid) : followUser(user.uid)}
                  className={`p-1.5 rounded-full transition-colors ${isFollowing(user.uid) ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {isFollowing(user.uid) ? <UserMinus size={16} /> : <UserPlus size={16} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Seguidos */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Siguiendo</h4>
        {followingUsers.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No sigues a nadie aún.</p>
        ) : (
          <div className="space-y-2">
            {followingUsers.map(user => (
              <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                 <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => unfollowUser(user.uid)}
                  className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-full"
                  title="Dejar de seguir"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
