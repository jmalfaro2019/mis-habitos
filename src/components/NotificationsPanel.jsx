import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
  getDocs,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { Bell, Heart, UserPlus } from 'lucide-react';
import { Button } from './BaseUI';

export default function NotificationsPanel({ db, user, onViewProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar en cliente
      notifs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user, db]);

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  };

  const handleAcceptCoupleInvite = async (notif) => {
    try {
      // Update both users' profiles
      await updateDoc(doc(db, 'users', user.uid), { partnerId: notif.fromUid });
      await updateDoc(doc(db, 'users', notif.fromUid), { partnerId: user.uid });

      // Update invite status
      const invitesQuery = query(
        collection(db, 'couple_invites'),
        where('fromUid', '==', notif.fromUid),
        where('toUid', '==', user.uid),
        where('status', '==', 'pending')
      );
      const inviteSnapshot = await getDocs(invitesQuery);
      inviteSnapshot.forEach(async (inviteDoc) => {
        await updateDoc(doc(db, 'couple_invites', inviteDoc.id), { status: 'accepted' });
      });

      // Delete the notification
      await deleteDoc(doc(db, 'notifications', notif.id));

      // Force reload to ensure fresh data
      window.location.reload();
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleRejectCoupleInvite = async (notif) => {
    try {
      // Update invite status
      const invitesQuery = query(
        collection(db, 'couple_invites'),
        where('fromUid', '==', notif.fromUid),
        where('toUid', '==', user.uid),
        where('status', '==', 'pending')
      );
      const inviteSnapshot = await getDocs(invitesQuery);
      inviteSnapshot.forEach(async (inviteDoc) => {
        await updateDoc(doc(db, 'couple_invites', inviteDoc.id), { status: 'rejected' });
      });

      // Delete the notification
      await deleteDoc(doc(db, 'notifications', notif.id));
    } catch (error) {
      console.error("Error rejecting invite:", error);
    }
  };

  const getDisplayName = (email) => {
    return email?.split('@')[0] || 'Usuario';
  };

  const NotificationUserLink = ({ uid, displayName, notifId, read }) => (
    <span
      className="font-semibold hover:underline cursor-pointer text-indigo-700"
      onClick={(e) => {
        e.stopPropagation();
        if (onViewProfile) onViewProfile(uid);
        if (!read) markAsRead(notifId);
      }}
    >
      {displayName}
    </span>
  );

  const renderNotification = (notif) => {
    // Get display name from notification or fallback to email
    const displayName = notif.fromDisplayName || getDisplayName(notif.fromEmail);

    switch (notif.type) {
      case 'new_follower':
        return (
          <>
            <UserPlus size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <NotificationUserLink
                  uid={notif.fromUid}
                  displayName={displayName}
                  notifId={notif.id}
                  read={notif.read}
                />{' '}
                ha comenzado a seguirte.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {notif.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
              </p>
            </div>
          </>
        );

      case 'couple_invite':
        return (
          <>
            <Heart size={16} className="text-pink-600 mt-0.5 flex-shrink-0" fill="currentColor" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <NotificationUserLink
                  uid={notif.fromUid}
                  displayName={displayName}
                  notifId={notif.id}
                  read={notif.read}
                />{' '}
                quiere ser tu pareja 💕
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAcceptCoupleInvite(notif)}
                  className="text-xs bg-pink-600 text-white px-3 py-1 rounded-lg hover:bg-pink-700 font-bold"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => handleRejectCoupleInvite(notif)}
                  className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-300"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </>
        );

      case 'couple_kiss':
        return (
          <>
            <Heart size={16} className="text-pink-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <NotificationUserLink
                  uid={notif.fromUid}
                  displayName={displayName}
                  notifId={notif.id}
                  read={notif.read}
                />{' '}
                te envió un beso de ánimo 💋
              </p>
              {notif.message && (
                <p className="text-xs text-slate-500 mt-1 italic">"{notif.message}"</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {notif.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden">
            <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50">
              <h3 className="text-xs font-bold text-slate-500 uppercase">Notificaciones</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:underline font-bold">
                  Marcar leídas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-slate-400 text-sm">No tienes notificaciones.</p>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && notif.type !== 'couple_invite' && markAsRead(notif.id)}
                    className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${notif.type !== 'couple_invite' ? 'cursor-pointer' : ''} ${!notif.read ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="flex gap-3">
                      {renderNotification(notif)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
