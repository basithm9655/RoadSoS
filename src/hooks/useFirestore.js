import { useState, useEffect, useCallback } from 'react';
import { getUser, setUser } from '../utils/firebaseHelpers';
import { useAuth } from '../context/AuthContext';

export function useFirestore() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await getUser(user.uid);
      if (data) {
        setUserData(data);
      } else {
        // Initialize new user
        const defaultData = {
          name: user.displayName || 'RoadSOS User',
          phone: '',
          familyContacts: [],
          role: 'user',
          createdAt: Date.now(),
        };
        await setUser(user.uid, defaultData);
        setUserData(defaultData);
      }
    } catch (err) {
      console.error('useFirestore error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const updateUserData = useCallback(async (updates) => {
    if (!user) return;
    await setUser(user.uid, updates);
    setUserData(prev => ({ ...prev, ...updates }));
  }, [user]);

  return { userData, loading, updateUserData, refetch: loadUser };
}
