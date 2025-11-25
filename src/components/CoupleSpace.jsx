import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Heart, Send, Target } from 'lucide-react';
import { Input, Button } from './BaseUI';

export default function CoupleSpace({ db, user, userProfile }) {
  const [partner, setPartner] = useState(null);
  const [myHabits, setMyHabits] = useState([]);
  const [partnerHabits, setPartnerHabits] = useState([]);
  const [kisses, setKisses] = useState([]);
  const [kissMessage, setKissMessage] = useState('');
  const [sending, setSending] = useState(false);

  const partnerId = userProfile?.partnerId;

  // Load Partner Info
  useEffect(() => {
    if (!partnerId) return;
    const loadPartner = async () => {
      const partnerDoc = await getDoc(doc(db, 'users', partnerId));
      if (partnerDoc.exists()) setPartner(partnerDoc.data());
    };
    loadPartner();
  }, [partnerId, db]);

  // Load My Habits
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'habitos'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyHabits(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user, db]);

  // Load Partner Habits
  useEffect(() => {
    if (!partnerId) return;
    const q = query(collection(db, 'habitos'), where('userId', '==', partnerId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartnerHabits(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [partnerId, db]);

  // Load Recent Kisses
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'couple_kisses'),
      where('toUid', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedKisses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loadedKisses.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setKisses(loadedKisses.slice(0, 5)); // Show last 5
    });
    return () => unsubscribe();
  }, [user, db]);

  const sendKiss = async (e) => {
    e.preventDefault();
    if (!partnerId) return;
    
    setSending(true);
    try {
      // Create kiss document
      await addDoc(collection(db, 'couple_kisses'), {
        fromUid: user.uid,
        toUid: partnerId,
        message: kissMessage.trim(),
        createdAt: serverTimestamp()
      });

      // Create notification
      await addDoc(collection(db, 'notifications'), {
        userId: partnerId,
        type: 'couple_kiss',
        fromUid: user.uid,
        fromEmail: user.email,
        fromDisplayName: userProfile?.displayName || user.email.split('@')[0],
        message: kissMessage.trim(),
        read: false,
        createdAt: serverTimestamp()
      });

      setKissMessage('');
      alert('¡Beso enviado! 💋');
    } catch (error) {
      console.error("Error sending kiss:", error);
    } finally {
      setSending(false);
    }
  };

  const handleUnlinkCouple = async () => {
    if (!confirm('¿Estás seguro de que quieres desvincular tu pareja? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Remove partnerId from both users
      await updateDoc(doc(db, 'users', user.uid), { partnerId: null });
      await updateDoc(doc(db, 'users', partnerId), { partnerId: null });

      alert('Pareja desvinculada.');
    } catch (error) {
      console.error("Error unlinking couple:", error);
      alert('Error al desvincular. Inténtalo de nuevo.');
    }
  };

  if (!partnerId) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
        <Heart size={40} className="text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Aún no tienes pareja. Invita a alguien desde tu lista de seguidos.</p>
      </div>
    );
  }

  if (!partner) {
    return <div className="p-8 text-center text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Partner Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Heart size={24} fill="currentColor" />
              Espacio de Pareja
            </h2>
            <p className="text-pink-100 mt-1">Con {partner.displayName || partner.email.split('@')[0]}</p>
          </div>
          <button
            onClick={handleUnlinkCouple}
            className="text-pink-100 hover:text-white text-xs font-bold px-3 py-1.5 border border-pink-200/50 rounded-lg hover:bg-white/10 transition-colors"
          >
            Desvincular
          </button>
        </div>
      </div>

      {/* Beso de Ánimo Section */}
      <div className="bg-white rounded-2xl p-6 border border-pink-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Heart size={20} className="text-pink-600" fill="currentColor" />
          Beso de Ánimo
        </h3>
        
        <form onSubmit={sendKiss} className="space-y-3">
          <Input 
            value={kissMessage}
            onChange={(e) => setKissMessage(e.target.value)}
            placeholder="Mensaje opcional (ej: ¡Vas genial!)"
            className="text-sm"
          />
          <Button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2">
            <Send size={18} />
            {sending ? 'Enviando...' : 'Enviar Beso 💋'}
          </Button>
        </form>

        {/* Recent Kisses */}
        {kisses.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Besos Recibidos</h4>
            <div className="space-y-2">
              {kisses.map(kiss => (
                <div key={kiss.id} className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                  <div className="flex items-start gap-2">
                    <Heart size={14} className="text-pink-600 mt-0.5 flex-shrink-0" fill="currentColor" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">
                        {kiss.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
                      </p>
                      {kiss.message && (
                        <p className="text-sm text-slate-700 italic mt-1">"{kiss.message}"</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shared Habits View */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* My Habits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-indigo-600" />
            Tus Objetivos
          </h3>
          <div className="space-y-2">
            {myHabits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin objetivos</p>
            ) : (
              myHabits.map(habit => (
                <div key={habit.id} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">{habit.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">Racha: {habit.streak} días</span>
                    <span className="text-xs text-indigo-600">· {habit.completions?.length || 0} completados</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Partner Habits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-pink-600" />
            Objetivos de {partner.displayName || partner.email.split('@')[0]}
          </h3>
          <div className="space-y-2">
            {partnerHabits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin objetivos</p>
            ) : (
              partnerHabits.map(habit => (
                <div key={habit.id} className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                  <p className="text-sm font-medium text-slate-700">{habit.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">Racha: {habit.streak} días</span>
                    <span className="text-xs text-pink-600">· {habit.completions?.length || 0} completados</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
