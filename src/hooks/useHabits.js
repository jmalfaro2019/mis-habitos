import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

export function useHabits(db, user) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'habitos'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time desc
      loadedHabits.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHabits(loadedHabits);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching habits:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  const addHabit = async (title) => {
    if (!title.trim() || !user) return;
    try {
      await addDoc(collection(db, 'habitos'), {
        title: title.trim(),
        userId: user.uid,
        userName: user.email.split('@')[0],
        createdAt: serverTimestamp(),
        completions: [],
        streak: 0
      });
      return true;
    } catch (error) {
      console.error("Error adding habit:", error);
      return false;
    }
  };

  const toggleHabit = async (habit) => {
    const today = new Date().toLocaleDateString('en-CA');
    const isCompletedToday = habit.completions.includes(today);
    
    let newCompletions = isCompletedToday 
      ? habit.completions.filter(d => d !== today)
      : [...habit.completions, today];
      
    let newStreak = isCompletedToday 
      ? Math.max(0, habit.streak - 1)
      : habit.streak + 1;

    try {
      await updateDoc(doc(db, 'habitos', habit.id), {
        completions: newCompletions,
        streak: newStreak
      });
    } catch (error) {
      console.error("Error toggling habit:", error);
    }
  };

  const deleteHabit = async (id) => {
    try {
      await deleteDoc(doc(db, 'habitos', id));
    } catch (error) {
      console.error("Error deleting habit:", error);
    }
  };

  return { habits, loading, addHabit, toggleHabit, deleteHabit };
}
