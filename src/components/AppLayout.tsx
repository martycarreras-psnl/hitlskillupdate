// App shell: brand header with a prototype role switcher, a left navigation rail
// (role-gated), and the routed content area. Routing is provided by HashRouter in
// main.tsx — this component renders only <Routes>/<Outlet>, never a Router.

import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Select,
  Tab,
  TabList,
  Text,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Board24Regular,
  ClipboardTask24Regular,
  DocumentMultiple24Regular,
  Settings24Regular,
  Wrench24Regular,
} from '@fluentui/react-icons';
import { useRole } from '@/hooks/useRole';
import { ALL_ROLES, canReview, isAdmin, type AppRole } from '@/constants/status';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  brandMark: {
    fontSize: '24px',
    lineHeight: '1',
  },
  roleSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    minHeight: 0,
  },
  nav: {
    paddingTop: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
    borderRightColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  content: {
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    overflowY: 'auto',
  },
});

interface NavItem {
  key: string;
  route: string;
  label: string;
  icon: JSX.Element;
  visible: (role: AppRole) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', route: '/', label: 'Dashboard', icon: <Board24Regular />, visible: () => true },
  { key: 'documents', route: '/documents', label: 'Documents', icon: <DocumentMultiple24Regular />, visible: () => true },
  { key: 'review', route: '/review', label: 'Review Queue', icon: <ClipboardTask24Regular />, visible: canReview },
  { key: 'skill-updates', route: '/skill-updates', label: 'Skill Updates', icon: <Wrench24Regular />, visible: canReview },
  { key: 'admin', route: '/admin', label: 'Admin Settings', icon: <Settings24Regular />, visible: isAdmin },
];

function routeToKey(pathname: string): string {
  if (pathname === '/' ) return 'dashboard';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/review')) return 'review';
  if (pathname.startsWith('/skill-updates')) return 'skill-updates';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'dashboard';
}

export function AppLayout() {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole } = useRole();

  const items = useMemo(() => NAV_ITEMS.filter((item) => item.visible(role)), [role]);
  const selected = routeToKey(location.pathname);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden>
            🗂️
          </span>
          <Title3 as="h1">Document Intake &amp; Review</Title3>
        </div>
        <div className={styles.roleSwitcher}>
          <Text size={200}>Viewing as</Text>
          <Select
            value={role}
            aria-label="Active role"
            onChange={(_e, data) => setRole(data.value as AppRole)}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>
          <TabList
            vertical
            selectedValue={selected}
            onTabSelect={(_e, data) => {
              const item = NAV_ITEMS.find((i) => i.key === data.value);
              if (item) navigate(item.route);
            }}
          >
            {items.map((item) => (
              <Tab key={item.key} value={item.key} icon={item.icon}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </nav>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
