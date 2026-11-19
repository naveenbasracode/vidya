import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './context/auth.jsx';
import { todayStr } from './utils.js';

/** Builds paths for the current student: studentPath('/agenda') → /students/me/agenda */
export const useStudentApi = () => {
  const { studentId } = useAuth();
  const studentApi = useCallback(
    (path, opts) => {
      if (!studentId) return Promise.reject(new Error('No student selected.'));
      const sep = path.includes('?') ? '&' : '?';
      const withToday = opts?.method && opts.method !== 'GET' ? path : `${path}${sep}today=${todayStr()}`;
      return api(`/students/${studentId}${withToday}`, opts);
    },
    [studentId],
  );
  return { studentApi, studentId };
};

/** Load data and keep loading/error state. `deps` re-trigger the load. */
export const useLoad = (loader, deps) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const counter = useRef(0);
  const reload = useCallback(async () => {
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    try {
      const d = await loader();
      if (id === counter.current) setData(d);
    } catch (e) {
      if (id === counter.current) setError(e.message || String(e));
    } finally {
      if (id === counter.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, setData, error, loading, reload };
};
