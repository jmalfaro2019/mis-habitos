import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { X, Search, UserPlus, UserMinus, Heart } from 'lucide-react';
import { Input, Button } from './BaseUI';

export default function SocialModal({ 
  isOpen, 
  onClose, 
  initialTab = 'following', // 'followers', 'following', or 'search'
  db, 
  currentUser, 
  userProfile 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Fetch users based on tab
  useEffect(() => {
    if (activeTab === 'search') {
      setLoading(false);
      return; // Don't fetch for search tab
    }

    const fetchUsers = async () => {
      setLoading(true);
      setUsers([]);
      try {
        let userIds = [];
        if (activeTab === 'following') {
          userIds = userProfile?.following || [];
        } else {
          // Fetch followers (users who have currentUser.uid in their following list)
          const q = query(collection(db, 'users'), where('following', 'array-contains', currentUser.uid));
          const snapshot = await getDocs(q);
          const followers = snapshot.docs.map(d => d.data());
          setUsers(followers);
          setLoading(false);
          return; // Exit early for followers as we already have the data
        }

        if (userIds.length > 0) {
            // Fetch details for each followed user
            const usersData = [];
            for (const uid of userIds) {
                const d = await getDoc(doc(db, 'users', uid));
                if (d.exists()) usersData.push(d.data());
            }
            setUsers(usersData);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, userProfile, db, currentUser]);

  // Search for users
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', searchTerm.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(d => d.data())
        .filter(u => u.uid !== currentUser.uid); // Don't show current user
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (targetUid) => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        following: arrayUnion(targetUid)
      });

      // Create notification for the followed user
      const displayName = userProfile?.displayName || currentUser.email.split('@')[0];
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        type: 'new_follower',
        fromUid: currentUser.uid,
        fromEmail: currentUser.email,
        fromDisplayName: displayName,
        read: false,
        createdAt: serverTimestamp()
      });

      // Update search results to show followed status
      setSearchResults(searchResults.map(u => 
        u.uid === targetUid ? {...u, _justFollowed: true} : u
      ));
    } catch (err) {
      console.error(err);
      alert("Error al seguir usuario");
    }
  };

  const handleUnfollow = async (targetUid) => {
      try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
              following: arrayRemove(targetUid)
          });
          // Optimistic update
          setUsers(users.filter(u => u.uid !== targetUid));
      } catch (err) { console.error(err); }
  };

  const handleInvitePartner = async (targetUser) => {
      try {
          // Check if user already has a partner
          if (userProfile?.partnerId) {
              alert("Ya tienes pareja. Solo puedes tener una pareja a la vez.");
              return;
          }

          const displayName = userProfile?.displayName || currentUser.email.split('@')[0];

          if (confirm(`¿Quieres invitar a ${targetUser.displayName || targetUser.email.split('@')[0]} a ser tu pareja en la app?`)) {
              // Create couple invite
              await addDoc(collection(db, 'couple_invites'), {
                  fromUid: currentUser.uid,
                  fromEmail: currentUser.email,
                  fromDisplayName: displayName,
                  toUid: targetUser.uid,
                  toEmail: targetUser.email,
                  status: 'pending',
                  createdAt: serverTimestamp()
              });

              // Create notification for the recipient
              await addDoc(collection(db, 'notifications'), {
                  userId: targetUser.uid,
                  type: 'couple_invite',
                  fromUid: currentUser.uid,
                  fromEmail: currentUser.email,
                  fromDisplayName: displayName,
                  read: false,
                  createdAt: serverTimestamp()
              });

              alert("¡Invitación enviada! 💕");
          }
      } catch (error) {
          console.error("Error sending couple invite:", error);
          alert("Error al enviar invitación. Inténtalo de nuevo.");
      }
  };

  const isFollowing = (uid) => {
    return userProfile?.following?.includes(uid);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800">Social</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'search' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Buscar
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'following' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Siguiendo
          </button>
          <button 
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'followers' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Seguidores
          </button>
        </div>

        {/* Search Tab Content */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Input 
                type="email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por email..."
                className="pr-12"
              />
              <button 
                type="submit"
                disabled={!searchTerm.trim() || searching}
                className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <Search size={20} />
              </button>
            </form>

            <div className="space-y-3">
              {searching ? (
                <p className="text-center text-slate-400 py-8">Buscando...</p>
              ) : searchResults.length === 0 && searchTerm ? (
                <p className="text-center text-slate-400 py-8">No se encontraron usuarios</p>
              ) : (
                searchResults.map(user => {
                  const following = isFollowing(user.uid) || user._justFollowed;
                  return (
                    <div key={user.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                          {(user.displayName || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{user.displayName || user.email.split('@')[0]}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      {following ? (
                        <span className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg">
                          Siguiendo
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleFollow(user.uid)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <UserPlus size={14} />
                          Seguir
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Following/Followers List */}
        {activeTab !== 'search' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <p className="text-center text-slate-400 py-8">Cargando...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                  {activeTab === 'following' ? 'No sigues a nadie aún.' : 'Aún no tienes seguidores.'}
              </p>
            ) : (
              users.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      {(user.displayName || user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{user.displayName || user.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                      {activeTab === 'following' && (
                          <>
                              <button 
                                  onClick={() => handleInvitePartner(user)}
                                  disabled={userProfile?.partnerId}
                                  className={`p-2 rounded-full transition-colors ${
                                      userProfile?.partnerId 
                                      ? 'text-slate-300 cursor-not-allowed' 
                                      : 'text-pink-400 hover:bg-pink-50 hover:text-pink-600'
                                  }`}
                                  title={userProfile?.partnerId ? "Ya tienes pareja" : "Invitar como Pareja"}
                              >
                                  <Heart size={18} />
                              </button>
                              <button 
                                  onClick={() => handleUnfollow(user.uid)}
                                  className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                                  title="Dejar de seguir"
                              >
                                  <UserMinus size={18} />
                              </button>
                          </>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
