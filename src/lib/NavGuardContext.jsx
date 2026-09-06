import { createContext, useContext, useRef, useCallback } from 'react';

const NavGuardContext = createContext(null);

/**
 * Lets a single in-progress form intercept section navigation so it can warn first.
 * The guard receives a `proceed` callback and is responsible for calling it.
 */
export function NavGuardProvider({ children }) {
  const guardRef = useRef(null);

  const setGuard = useCallback((guard) => { guardRef.current = guard; }, []);

  const attemptNavigation = useCallback((proceed) => {
    if (guardRef.current) guardRef.current(proceed);
    else proceed();
  }, []);

  return <NavGuardContext.Provider value={{ setGuard, attemptNavigation }}>{children}</NavGuardContext.Provider>;
}

export const useNavGuard = () => useContext(NavGuardContext);