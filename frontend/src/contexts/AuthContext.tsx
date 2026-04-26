/**
 * AuthContext — wraps Firebase Auth + Firestore user profile.
 * Falls back gracefully when Firebase is not configured.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection,
  addDoc, query, orderBy, limit, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, firebaseConfigured } from '../firebase';

// ── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bookmarks: string[];          // entity UUIDs
  tourDone: boolean;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  ts: number;
}

interface AuthCtx {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleBookmark: (entityId: string) => Promise<void>;
  isBookmarked: (entityId: string) => boolean;
  saveChatMessage: (entityId: string, msg: ChatMessage) => Promise<void>;
  getChatHistory: (entityId: string) => Promise<ChatMessage[]>;
  setTourDone: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Auth state listener ────────────────────────────────────────────────

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await ensureProfile(u);
        const p = await loadProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  // ── Firestore helpers ──────────────────────────────────────────────────

  async function ensureProfile(u: User) {
    if (!db) return;
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        bookmarks: [],
        tourDone: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function loadProfile(uid: string): Promise<UserProfile> {
    if (!db) return { uid, displayName: null, email: null, photoURL: null, bookmarks: [], tourDone: false };
    const snap = await getDoc(doc(db, 'users', uid));
    const data = snap.data() || {};
    return {
      uid,
      displayName: data.displayName ?? null,
      email: data.email ?? null,
      photoURL: data.photoURL ?? null,
      bookmarks: data.bookmarks ?? [],
      tourDone: data.tourDone ?? false,
    };
  }

  // ── Auth actions ───────────────────────────────────────────────────────

  async function signInWithGoogle() {
    if (!auth) return;
    await signInWithPopup(auth, googleProvider);
  }

  async function signOut() {
    if (!auth) return;
    await fbSignOut(auth);
  }

  // ── Bookmarks ──────────────────────────────────────────────────────────

  async function toggleBookmark(entityId: string) {
    if (!db || !user) return;
    const ref = doc(db, 'users', user.uid);
    const bookmarked = profile?.bookmarks.includes(entityId);
    await updateDoc(ref, {
      bookmarks: bookmarked ? arrayRemove(entityId) : arrayUnion(entityId),
    });
    const p = await loadProfile(user.uid);
    setProfile(p);
  }

  function isBookmarked(entityId: string) {
    return profile?.bookmarks.includes(entityId) ?? false;
  }

  // ── Chat history ───────────────────────────────────────────────────────

  async function saveChatMessage(entityId: string, msg: ChatMessage) {
    if (!db || !user) return;
    const col = collection(db, 'users', user.uid, 'chats', entityId, 'messages');
    await addDoc(col, { ...msg, savedAt: serverTimestamp() });
  }

  async function getChatHistory(entityId: string): Promise<ChatMessage[]> {
    if (!db || !user) return [];
    const col = collection(db, 'users', user.uid, 'chats', entityId, 'messages');
    const q = query(col, orderBy('ts', 'asc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChatMessage);
  }

  // ── Tour done ──────────────────────────────────────────────────────────

  async function setTourDone() {
    if (!db || !user) {
      localStorage.setItem('mc_tour_done', '1');
      return;
    }
    await updateDoc(doc(db, 'users', user.uid), { tourDone: true });
    setProfile(p => p ? { ...p, tourDone: true } : p);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      configured: firebaseConfigured,
      signInWithGoogle, signOut,
      toggleBookmark, isBookmarked,
      saveChatMessage, getChatHistory,
      setTourDone,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
