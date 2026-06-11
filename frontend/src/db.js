import { db } from './firebase';
import { 
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, 
  query, orderBy, limit, where, doc, serverTimestamp 
} from 'firebase/firestore';

// ─── Workout Sessions ───────────────────────────────────────────────────────

/**
 * Save a completed workout session to Firestore
 */
export const saveSession = async (userId, exerciseType, reps, formScore, durationMinutes) => {
  try {
    const docRef = await addDoc(collection(db, "sessions"), {
      userId,
      exerciseType,
      correctReps: reps,
      formScore,
      durationMinutes: durationMinutes || 0,
      timestamp: serverTimestamp()
    });
    
    // Also update the user's aggregate stats
    await updateUserStats(userId, reps, durationMinutes || 0);
    
    return docRef.id;
  } catch (e) {
    console.error("Error adding session: ", e);
    return null;
  }
};

/**
 * Get all sessions for a specific user (most recent first)
 */
export const getUserSessions = async (userId) => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const sessions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({ 
        id: doc.id, 
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      });
    });
    return sessions;
  } catch (e) {
    console.error("Error fetching user sessions: ", e);
    return [];
  }
};

// ─── User Profile ───────────────────────────────────────────────────────────

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Error fetching user profile: ", e);
    return null;
  }
};

/**
 * Create or update user profile in Firestore
 */
export const saveUserProfile = async (userId, profileData) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(docRef, {
        ...profileData,
        totalReps: 0,
        totalMinutes: 0,
        streak: 0,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return true;
  } catch (e) {
    console.error("Error saving user profile: ", e);
    return false;
  }
};

/**
 * Update aggregate user stats after a workout
 */
const updateUserStats = async (userId, newReps, newMinutes) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const current = docSnap.data();
      await updateDoc(docRef, {
        totalReps: (current.totalReps || 0) + newReps,
        totalMinutes: (current.totalMinutes || 0) + newMinutes,
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Error updating user stats: ", e);
  }
};

// ─── Leaderboard ────────────────────────────────────────────────────────────

/**
 * Fetch the global leaderboard (ranked by total correct reps)
 */
export const getLeaderboard = async () => {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("totalReps", "desc"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const leaderboard = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      leaderboard.push({ 
        id: docSnap.id, 
        displayName: data.displayName || "Anonymous",
        photoURL: data.photoURL || null,
        totalReps: data.totalReps || 0,
        totalMinutes: data.totalMinutes || 0,
        streak: data.streak || 0
      });
    });
    return leaderboard;
  } catch (e) {
    console.error("Error fetching leaderboard: ", e);
    return [];
  }
};

// ─── Weekly Activity (for dashboard chart) ──────────────────────────────────

/**
 * Get the last 7 days of workout data for the chart
 */
export const getWeeklyActivity = async (userId) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      where("timestamp", ">=", sevenDaysAgo),
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    // Group by day
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = {};
    
    // Initialize all 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = dayNames[d.getDay()];
      dayMap[dayKey] = 0;
    }
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate?.() || new Date();
      const dayKey = dayNames[date.getDay()];
      dayMap[dayKey] = (dayMap[dayKey] || 0) + (data.correctReps || 0);
    });
    
    return Object.entries(dayMap).map(([day, reps]) => ({ day, reps }));
  } catch (e) {
    console.error("Error fetching weekly activity: ", e);
    // Return fallback data
    return [
      { day: 'Mon', reps: 0 }, { day: 'Tue', reps: 0 },
      { day: 'Wed', reps: 0 }, { day: 'Thu', reps: 0 },
      { day: 'Fri', reps: 0 }, { day: 'Sat', reps: 0 },
      { day: 'Sun', reps: 0 }
    ];
  }
};
