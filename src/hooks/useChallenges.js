import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  getDocs,
  setDoc
} from 'firebase/firestore';

export function useChallenges(db, user) {
  const [myChallenges, setMyChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to get current period key (e.g., "2023-W48" or "2023-11")
  const getPeriodKey = (frequencyType) => {
    const now = new Date();
    if (frequencyType === 'MONTHLY') {
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    // Weekly: ISO Week
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  // 1. Fetch Challenges I'm participating in
  useEffect(() => {
    if (!user) {
      setMyChallenges([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'challenges'), 
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyChallenges(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  // 2. Create Challenge
  const createChallenge = async ({ title, description, type, frequency, participants = [] }) => {
    if (!user) return;
    
    try {
      const allParticipants = [...new Set([user.uid, ...participants])];
      
      const challengeData = {
        title,
        description,
        type, // 'GROUP', 'COUPLE', 'COMMUNITY'
        frequency: {
          type: frequency.type, // 'DAILY', 'WEEKLY', 'MONTHLY'
          target: parseInt(frequency.target) || 1
        },
        createdBy: user.uid,
        creatorName: user.email.split('@')[0],
        participants: allParticipants,
        createdAt: serverTimestamp(),
        status: 'ACTIVE'
      };

      const docRef = await addDoc(collection(db, 'challenges'), challengeData);
      
      // Initialize progress for creator
      const periodKey = getPeriodKey(frequency.type);
      await setDoc(doc(db, 'challenge_progress', `${docRef.id}_${user.uid}`), {
        challengeId: docRef.id,
        userId: user.uid,
        periods: {
          [periodKey]: { count: 0, completed: false }
        },
        lastCheckIn: null
      });

      return docRef.id;
    } catch (error) {
      console.error("Error creating challenge:", error);
      throw error;
    }
  };

  // 3. Check In Logic
  const checkIn = async (challengeId, frequencyType, target) => {
    if (!user) return;

    const progressRef = doc(db, 'challenge_progress', `${challengeId}_${user.uid}`);
    const periodKey = getPeriodKey(frequencyType);
    const now = new Date().toISOString();

    try {
        // We need to read current progress first to update count safely
        // Note: In a real app, use a transaction or cloud function to prevent race conditions
        const progressSnap = await getDocs(query(collection(db, 'challenge_progress'), where('challengeId', '==', challengeId), where('userId', '==', user.uid)));
        
        let currentData = {};
        let docId = `${challengeId}_${user.uid}`;
        
        if (!progressSnap.empty) {
            currentData = progressSnap.docs[0].data();
            docId = progressSnap.docs[0].id;
        }

        const currentPeriodData = currentData.periods?.[periodKey] || { count: 0, completed: false };
        
        // Don't allow if already completed period? (Optional rule)
        // if (currentPeriodData.completed) return; 

        const newCount = currentPeriodData.count + 1;
        const isCompleted = newCount >= target;

        await setDoc(doc(db, 'challenge_progress', docId), {
            challengeId,
            userId: user.uid,
            periods: {
                ...currentData.periods,
                [periodKey]: {
                    count: newCount,
                    completed: isCompleted,
                    lastUpdate: now
                }
            },
            checkins: arrayUnion(now)
        }, { merge: true });

        return true;
    } catch (error) {
        console.error("Error checking in:", error);
        return false;
    }
  };

  return { myChallenges, loading, createChallenge, checkIn };
}
