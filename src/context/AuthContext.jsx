import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        try {
          // Sign in anonymously if Firebase is configured
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (err) {
          // Firebase not configured — use local dummy user
          console.warn('Firebase auth unavailable, using local mode:', err.message);
          setUser({ uid: 'local-' + Math.random().toString(36).slice(2), isAnonymous: true, displayName: null });
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
