import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);
const CHILD_KEY = 'vidya.selectedChild';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChildId, setSelectedChildIdState] = useState(() => {
    try {
      return localStorage.getItem(CHILD_KEY);
    } catch {
      return null;
    }
  });

  const setSelectedChildId = useCallback((id) => {
    setSelectedChildIdState(id);
    try {
      if (id) localStorage.setItem(CHILD_KEY, id);
      else localStorage.removeItem(CHILD_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setChildrenList([]);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const refreshChildren = useCallback(async () => {
    const data = await api('/family/children');
    setChildrenList(data.children);
    return data.children;
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  // Restore session on load
  useEffect(() => {
    if (!getToken()) return;
    refreshUser()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [refreshUser, logout]);

  // Parents/admins: load children and keep a valid selection
  useEffect(() => {
    if (!user || user.role === 'STUDENT') return;
    refreshChildren()
      .then((kids) => {
        if (!kids.some((k) => k.id === selectedChildId)) setSelectedChildId(kids[0]?.id ?? null);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(() => {
    const isStudent = user?.role === 'STUDENT';
    const selectedChild = childrenList.find((c) => c.id === selectedChildId) ?? null;
    return {
      user,
      setUser,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isStudent,
      isParent: user?.role === 'PARENT',
      isAdmin: user?.role === 'ADMIN',
      childrenList,
      refreshChildren,
      selectedChild,
      setSelectedChildId,
      /** Which student's data the screens show: the student themself, or the parent's selected child. */
      studentId: isStudent ? 'me' : selectedChild?.id ?? null,
      studentName: isStudent ? user?.name : selectedChild?.name,
    };
  }, [user, loading, login, register, logout, refreshUser, childrenList, refreshChildren, selectedChildId, setSelectedChildId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
