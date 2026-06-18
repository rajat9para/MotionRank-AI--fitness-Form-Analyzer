import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, orderBy, limit, where, doc, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';

// ─── Posts ──────────────────────────────────────────────────────────────────

export const createPost = async (userId, text, photoUrls = []) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? userDoc.data() : {};

    const docRef = await addDoc(collection(db, "posts"), {
      userId,
      userName: userData.displayName || "User",
      userPhoto: userData.photoURL || null,
      userStreak: userData.streak || 0,
      text,
      photoUrls,
      likes: [],
      commentsCount: 0,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error creating post:", e);
    throw e;
  }
};

export const getFeedPosts = async () => {
  try {
    const q = query(
      collection(db, "posts"),
      orderBy("timestamp", "desc"),
      limit(30)
    );
    const snapshot = await getDocs(q);
    const posts = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      posts.push({
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      });
    });
    return posts;
  } catch (e) {
    console.error("Error fetching posts:", e);
    return [];
  }
};

export const likePost = async (postId, userId) => {
  try {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) return false;

    const likes = postDoc.data().likes || [];
    if (likes.includes(userId)) {
      await updateDoc(postRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(userId) });
    }
    return true;
  } catch (e) {
    console.error("Error liking post:", e);
    return false;
  }
};

export const addComment = async (postId, userId, text, userName) => {
  try {
    await addDoc(collection(db, "comments"), {
      postId,
      userId,
      userName,
      text,
      timestamp: serverTimestamp()
    });
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, { commentsCount: (await getDoc(postRef)).data().commentsCount + 1 });
    return true;
  } catch (e) {
    console.error("Error adding comment:", e);
    return false;
  }
};

export const getComments = async (postId) => {
  try {
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      orderBy("timestamp", "asc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const comments = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date()
      });
    });
    return comments;
  } catch (e) {
    console.error("Error fetching comments:", e);
    return [];
  }
};

export const deletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, "posts", postId));
    return true;
  } catch (e) {
    console.error("Error deleting post:", e);
    return false;
  }
};

// ─── Bug Reports ────────────────────────────────────────────────────────────

export const submitBugReport = async (userId, userName, description, category) => {
  try {
    const docRef = await addDoc(collection(db, "bugReports"), {
      userId,
      userName: userName || "Anonymous",
      description,
      category,
      status: 'open',
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error submitting bug report:", e);
    throw e;
  }
};
