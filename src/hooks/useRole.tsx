// Prototype-only active-role context. Lets a demo switch between Uploader / Reviewer /
// Admin so role-gated screens can be validated. In production this is replaced by the
// signed-in user's Dataverse security roles — authorization is delegated to Dataverse
// (decision #11), not modeled in app code beyond this UI affordance.

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppRole } from '@/constants/status';

interface RoleContextValue {
  role: AppRole;
  setRole: (role: AppRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>('Admin');
  const value = useMemo(() => ({ role, setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
