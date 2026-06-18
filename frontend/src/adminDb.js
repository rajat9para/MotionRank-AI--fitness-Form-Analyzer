import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, limit, where, doc, serverTimestamp, onSnapshot
} from 'firebase/firestore';

// ─── Admin Stats ────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const sessionsSnap = await getDocs(collection(db, "sessions"));
    const reportsSnap = await getDocs(query(collection(db, "bugReports"), where("status", "==", "open")));

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalReps = users.reduce((sum, u) => sum + (u.totalReps || 0), 0);

    return {
      totalUsers: users.length,
      totalSessions: sessionsSnap.size,
      openBugReports: reportsSnap.size,
      totalReps
    };
  } catch (e) {
    console.error("Error fetching admin stats:", e);
    return { totalUsers: 0, totalSessions: 0, openBugReports: 0, totalReps: 0 };
  }
};

// ─── User Management ────────────────────────────────────────────────────────

export const getAllUsers = async () => {
  try {
    const q = query(collection(db, "users"), orderBy("joinedAt", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching users:", e);
    return [];
  }
};

export const banUser = async (userId) => {
  try {
    await updateDoc(doc(db, "users", userId), { banned: true, bannedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.error("Error banning user:", e);
    return false;
  }
};

export const unbanUser = async (userId) => {
  try {
    await updateDoc(doc(db, "users", userId), { banned: false });
    return true;
  } catch (e) {
    console.error("Error unbanning user:", e);
    return false;
  }
};

// ─── Announcements ──────────────────────────────────────────────────────────

export const createAnnouncement = async (title, message, authorEmail) => {
  try {
    const docRef = await addDoc(collection(db, "announcements"), {
      title,
      message,
      author: authorEmail,
      active: true,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error creating announcement:", e);
    throw e;
  }
};

export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date()
    }));
  } catch (e) {
    console.error("Error fetching announcements:", e);
    return [];
  }
};

export const toggleAnnouncement = async (announcementId, active) => {
  try {
    await updateDoc(doc(db, "announcements", announcementId), { active });
    return true;
  } catch (e) {
    console.error("Error toggling announcement:", e);
    return false;
  }
};

// ─── Challenges ─────────────────────────────────────────────────────────────

export const createChallenge = async (title, description, target, durationDays) => {
  try {
    const docRef = await addDoc(collection(db, "challenges"), {
      title,
      description,
      target,
      durationDays,
      participants: [],
      active: true,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error creating challenge:", e);
    throw e;
  }
};

export const getActiveChallenges = async () => {
  try {
    const q = query(collection(db, "challenges"), where("active", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching challenges:", e);
    return [];
  }
};

// ─── Bug Reports ────────────────────────────────────────────────────────────

export const getBugReports = async () => {
  try {
    const q = query(collection(db, "bugReports"), orderBy("timestamp", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || new Date()
    }));
  } catch (e) {
    console.error("Error fetching bug reports:", e);
    return [];
  }
};

export const updateBugReportStatus = async (reportId, status) => {
  try {
    await updateDoc(doc(db, "bugReports", reportId), { status });
    return true;
  } catch (e) {
    console.error("Error updating bug report:", e);
    return false;
  }
};
