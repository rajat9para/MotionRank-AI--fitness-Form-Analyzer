import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, doc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';

// ─── Workout Sessions ───────────────────────────────────────────────────────

export const saveSession = async (userId, exerciseType, reps, formScore, durationMinutes, holdSeconds = 0, goodFormSeconds = 0) => {
  try {
    const docRef = await addDoc(collection(db, "sessions"), {
      userId,
      exerciseType,
      correctReps: reps,
      formScore,
      durationMinutes: durationMinutes || 0,
      holdSeconds: holdSeconds || 0,
      goodFormSeconds: goodFormSeconds || 0,
      timestamp: serverTimestamp()
    });
    const statReps = exerciseType === 'plank' ? holdSeconds || 0 : reps;
    await updateUserStats(userId, statReps, durationMinutes || 0);
    return docRef.id;
  } catch (e) {
    console.error("Error adding session: ", e);
    return null;
  }
};

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

const updateUserStats = async (userId, newReps, newMinutes) => {
  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const current = docSnap.data();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let newStreak = current.streak || 0;
      const lastWorkout = current.lastWorkoutDate?.toDate?.();

      if (lastWorkout) {
        const lastWorkoutDay = new Date(lastWorkout.getFullYear(), lastWorkout.getMonth(), lastWorkout.getDate());
        const diffDays = Math.floor((today - lastWorkoutDay) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
        } else if (diffDays === 1) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      } else {
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

// ─── Weekly Activity ────────────────────────────────────────────────────────

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

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayMap = {};

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
    return [
      { day: 'Mon', reps: 0 }, { day: 'Tue', reps: 0 },
      { day: 'Wed', reps: 0 }, { day: 'Thu', reps: 0 },
      { day: 'Fri', reps: 0 }, { day: 'Sat', reps: 0 },
      { day: 'Sun', reps: 0 }
    ];
  }
};

// ─── Friends System ─────────────────────────────────────────────────────────

export const searchUsersByName = async (searchTerm, currentUserId) => {
  try {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const term = searchTerm.trim();
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

export const sendFriendRequest = async (fromUserId, toUserId, fromDisplayName, fromPhotoURL) => {
  try {
    const q = query(
      collection(db, "friendRequests"),
      where("from", "==", fromUserId),
      where("to", "==", toUserId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return { success: false, message: 'Request already sent' };

    const userDoc = await getDoc(doc(db, "users", fromUserId));
    const friends = userDoc.data()?.friends || [];
    if (friends.includes(toUserId)) return { success: false, message: 'Already friends' };

    const reverseQ = query(
      collection(db, "friendRequests"),
      where("from", "==", toUserId),
      where("to", "==", fromUserId)
    );
    const reverseExisting = await getDocs(reverseQ);
    if (!reverseExisting.empty) {
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

export const acceptFriendRequest = async (requestId, currentUserId, fromUserId) => {
  try {
    const currentUserRef = doc(db, "users", currentUserId);
    const fromUserRef = doc(db, "users", fromUserId);

    await updateDoc(currentUserRef, { friends: arrayUnion(fromUserId) });
    await updateDoc(fromUserRef, { friends: arrayUnion(currentUserId) });
    await deleteDoc(doc(db, "friendRequests", requestId));

    return true;
  } catch (e) {
    console.error("Error accepting friend request:", e);
    return false;
  }
};

export const declineFriendRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, "friendRequests", requestId));
    return true;
  } catch (e) {
    console.error("Error declining friend request:", e);
    return false;
  }
};

export const removeFriend = async (currentUserId, friendUserId) => {
  try {
    const currentUserRef = doc(db, "users", currentUserId);
    const friendUserRef = doc(db, "users", friendUserId);

    await updateDoc(currentUserRef, { friends: arrayRemove(friendUserId) });
    await updateDoc(friendUserRef, { friends: arrayRemove(currentUserId) });

    return true;
  } catch (e) {
    console.error("Error removing friend:", e);
    return false;
  }
};

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

export const getFriends = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const friendIds = userDoc.data()?.friends || [];

    if (friendIds.length === 0) return [];

    const friends = [];
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

export const getExerciseDistribution = async (userId) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId),
      where("timestamp", ">=", twelveMonthsAgo)
    );
    const querySnapshot = await getDocs(q);

    const dist = { pushup: 0, squat: 0, crunch: 0, plank: 0 };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const type = data.exerciseType || 'unknown';
      if (dist[type] !== undefined) {
        dist[type] += (data.correctReps || 0);
      }
    });

    return [
      { subject: 'Pushups', A: dist.pushup, fullMark: Math.max(100, dist.pushup) },
      { subject: 'Squats', A: dist.squat, fullMark: Math.max(100, dist.squat) },
      { subject: 'Crunches', A: dist.crunch, fullMark: Math.max(100, dist.crunch) },
      { subject: 'Plank', A: dist.plank, fullMark: Math.max(100, dist.plank) },
    ];
  } catch (e) {
    console.error("Error fetching exercise distribution:", e);
    return [];
  }
};

export const getHeatmapData = async (userId) => {
  try {
    const today = new Date();
    const twelveWeeksAgo = new Date(today);
    twelveWeeksAgo.setDate(today.getDate() - 84);

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

      const dateStr = date.toISOString().split('T')[0];
      const val = data.exerciseType === 'plank' ? (data.holdSeconds || 0) : (data.correctReps || 0);
      dayMap[dateStr] = (dayMap[dateStr] || 0) + val;
    });

    return Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  } catch (e) {
    console.error("Error fetching heatmap data:", e);
    return [];
  }
};
