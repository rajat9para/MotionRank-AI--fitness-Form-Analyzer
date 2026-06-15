import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, doc, serverTimestamp, arrayUnion, arrayRemove
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

    // Also update the user's aggregate stats + streak
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
        lastWorkoutDate: null,
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
 * Update aggregate user stats after a workout, including streak calculation
 */
const updateUserStats = async (userId, newReps, newMinutes) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const current = docSnap.data();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Streak calculation
      let newStreak = current.streak || 0;
      const lastWorkout = current.lastWorkoutDate?.toDate?.();

      if (lastWorkout) {
        const lastWorkoutDay = new Date(lastWorkout.getFullYear(), lastWorkout.getMonth(), lastWorkout.getDate());
        const diffDays = Math.floor((today - lastWorkoutDay) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day — streak stays the same
        } else if (diffDays === 1) {
          // Consecutive day — increment streak
          newStreak += 1;
        } else {
          // Gap of 2+ days — streak resets to 1
          newStreak = 1;
        }
      } else {
        // First workout ever
        newStreak = 1;
      }

      await updateDoc(docRef, {
        totalReps: (current.totalReps || 0) + newReps,
        totalMinutes: (current.totalMinutes || 0) + newMinutes,
        streak: newStreak,
        lastWorkoutDate: serverTimestamp(),
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
 * NOTE: This query requires a Firestore index on the `users` collection
 * ordered by `totalReps` descending. Firestore will auto-suggest the index
 * when this query first runs — click the link in the console error to create it.
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
      // Only include users who have done at least 1 rep
      if (data.totalReps > 0) {
        leaderboard.push({
          id: docSnap.id,
          displayName: data.displayName || "Anonymous",
          photoURL: data.photoURL || null,
          totalReps: data.totalReps || 0,
          totalMinutes: data.totalMinutes || 0,
          streak: data.streak || 0
        });
      }
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
 * NOTE: This compound query (userId + timestamp range + orderBy) requires
 * a Firestore composite index. Firestore will auto-suggest it in the
 * console error — click the link to create it.
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

// ─── Friends System ─────────────────────────────────────────────────────────

/**
 * Search users by display name (case-insensitive partial match).
 * Firestore doesn't support native case-insensitive search, so we fetch
 * a range and filter client-side. Limited to 20 results.
 */
export const searchUsersByName = async (searchTerm, currentUserId) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const term = searchTerm.trim();
    // Firestore range query for prefix matching
    const q = query(
      collection(db, "users"),
      orderBy("displayName"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const results = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.displayName || '';
      // Case-insensitive partial match
      if (
        name.toLowerCase().includes(term.toLowerCase()) &&
        docSnap.id !== currentUserId
      ) {
        results.push({
          id: docSnap.id,
          displayName: name,
          photoURL: data.photoURL || null,
          totalReps: data.totalReps || 0,
          streak: data.streak || 0
        });
      }
    });

    return results.slice(0, 20);
  } catch (e) {
    console.error("Error searching users:", e);
    return [];
  }
};

/**
 * Send a friend request from one user to another.
 * Creates a document in the 'friendRequests' collection.
 */
export const sendFriendRequest = async (fromUserId, toUserId, fromDisplayName, fromPhotoURL) => {
  try {
    // Check if request already exists
    const q = query(
      collection(db, "friendRequests"),
      where("from", "==", fromUserId),
      where("to", "==", toUserId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return { success: false, message: 'Request already sent' };

    // Check if already friends
    const userDoc = await getDoc(doc(db, "users", fromUserId));
    const friends = userDoc.data()?.friends || [];
    if (friends.includes(toUserId)) return { success: false, message: 'Already friends' };

    // Check reverse request (they already sent you one)
    const reverseQ = query(
      collection(db, "friendRequests"),
      where("from", "==", toUserId),
      where("to", "==", fromUserId)
    );
    const reverseExisting = await getDocs(reverseQ);
    if (!reverseExisting.empty) {
      // Auto-accept the reverse request
      const reverseDoc = reverseExisting.docs[0];
      await acceptFriendRequest(reverseDoc.id, fromUserId, toUserId);
      return { success: true, message: 'You are now friends!' };
    }

    await addDoc(collection(db, "friendRequests"), {
      from: fromUserId,
      to: toUserId,
      fromDisplayName: fromDisplayName || 'User',
      fromPhotoURL: fromPhotoURL || null,
      status: 'pending',
      timestamp: serverTimestamp()
    });

    return { success: true, message: 'Friend request sent!' };
  } catch (e) {
    console.error("Error sending friend request:", e);
    return { success: false, message: 'Failed to send request' };
  }
};

/**
 * Accept a friend request — adds each user to the other's friends array.
 */
export const acceptFriendRequest = async (requestId, currentUserId, fromUserId) => {
  try {
    // Add each user to the other's friends list
    const currentUserRef = doc(db, "users", currentUserId);
    const fromUserRef = doc(db, "users", fromUserId);

    await updateDoc(currentUserRef, {
      friends: arrayUnion(fromUserId)
    });
    await updateDoc(fromUserRef, {
      friends: arrayUnion(currentUserId)
    });

    // Delete the friend request
    await deleteDoc(doc(db, "friendRequests", requestId));

    return true;
  } catch (e) {
    console.error("Error accepting friend request:", e);
    return false;
  }
};

/**
 * Decline/reject a friend request.
 */
export const declineFriendRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, "friendRequests", requestId));
    return true;
  } catch (e) {
    console.error("Error declining friend request:", e);
    return false;
  }
};

/**
 * Remove a friend from both users' friends lists.
 */
export const removeFriend = async (currentUserId, friendUserId) => {
  try {
    const currentUserRef = doc(db, "users", currentUserId);
    const friendUserRef = doc(db, "users", friendUserId);

    await updateDoc(currentUserRef, {
      friends: arrayRemove(friendUserId)
    });
    await updateDoc(friendUserRef, {
      friends: arrayRemove(currentUserId)
    });

    return true;
  } catch (e) {
    console.error("Error removing friend:", e);
    return false;
  }
};

/**
 * Get all pending friend requests for a user.
 */
export const getFriendRequests = async (userId) => {
  try {
    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userId),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const requests = [];
    querySnapshot.forEach((docSnap) => {
      requests.push({
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: docSnap.data().timestamp?.toDate?.() || new Date()
      });
    });
    return requests;
  } catch (e) {
    console.error("Error fetching friend requests:", e);
    return [];
  }
};

/**
 * Get a user's friends list with profile data.
 */
export const getFriends = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const friendIds = userDoc.data()?.friends || [];

    if (friendIds.length === 0) return [];

    const friends = [];
    // Fetch each friend's profile (Firestore doesn't support 'in' for doc refs directly for large lists)
    for (const fid of friendIds.slice(0, 50)) {
      const friendDoc = await getDoc(doc(db, "users", fid));
      if (friendDoc.exists()) {
        const data = friendDoc.data();
        friends.push({
          id: fid,
          displayName: data.displayName || 'User',
          photoURL: data.photoURL || null,
          totalReps: data.totalReps || 0,
          streak: data.streak || 0,
          totalMinutes: data.totalMinutes || 0
        });
      }
    }

    return friends;
  } catch (e) {
    console.error("Error fetching friends:", e);
    return [];
  }
};

// ─── Analytics ──────────────────────────────────────────────────────────────

/**
 * Get distribution of exercises (total reps per type) for the Radar chart.
 */
export const getExerciseDistribution = async (userId) => {
  try {
    // Limit to the last 12 months to keep the query cheap for power users.
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      where("timestamp", ">=", twelveMonthsAgo),
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    const dist = { pushup: 0, squat: 0, crunch: 0, pullup: 0, jumprope: 0, deadlift: 0 };
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const type = data.exerciseType || 'unknown';
      if (dist[type] !== undefined) {
        dist[type] += (data.correctReps || 0);
      }
    });

    // Format for Recharts Radar chart
    return [
      { subject: 'Pushups', A: dist.pushup, fullMark: Math.max(100, dist.pushup) },
      { subject: 'Squats', A: dist.squat, fullMark: Math.max(100, dist.squat) },
      { subject: 'Crunches', A: dist.crunch, fullMark: Math.max(100, dist.crunch) },
      // Placeholders for future exercises to make the radar shape look good
      { subject: 'Pullups', A: dist.pullup, fullMark: 100 },
      { subject: 'Jump Rope', A: dist.jumprope, fullMark: 100 },
      { subject: 'Deadlifts', A: dist.deadlift, fullMark: 100 },
    ];
  } catch (e) {
    console.error("Error fetching exercise distribution:", e);
    return [];
  }
};

/**
 * Get 12-week heatmap data (daily rep counts).
 */
export const getHeatmapData = async (userId) => {
  try {
    const today = new Date();
    const twelveWeeksAgo = new Date(today);
    twelveWeeksAgo.setDate(today.getDate() - 84); // 12 weeks = 84 days

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      where("timestamp", ">=", twelveWeeksAgo),
      orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);

    const dayMap = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate?.();
      if (!date) return;
      
      // Format as YYYY-MM-DD
      const dateStr = date.toISOString().split('T')[0];
      dayMap[dateStr] = (dayMap[dateStr] || 0) + (data.correctReps || 0);
    });

    return Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  } catch (e) {
    console.error("Error fetching heatmap data:", e);
    return [];
  }
};

