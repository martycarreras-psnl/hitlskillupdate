// App shell: a dark navy top bar, a light sectioned left navigation rail (role-gated)
// with a blue selected-accent, and the routed content area. Routing is provided by
// HashRouter in main.tsx — this renders only <Outlet>, never a Router.

import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Select, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  Board24Regular,
  ClipboardTask24Regular,
  DocumentMultiple24Regular,
  Settings24Regular,
  Wrench24Regular,
} from '@fluentui/react-icons';
import { useRole } from '@/hooks/useRole';
import { ALL_ROLES, canReview, isAdmin, type AppRole } from '@/constants/status';
import { surfaces } from '@/theme';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    backgroundColor: tokens.colorNeutralBackground2,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    height: '56px',
    paddingLeft: tokens.spacingHorizontalXL,
    paddingRight: tokens.spacingHorizontalXL,
    backgroundImage: surfaces.headerGradient,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderBottomColor: surfaces.headerBorder,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
  },
  brandMark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.14)',
    fontSize: '18px',
    lineHeight: '1',
    flexShrink: 0,
  },
  brandText: { display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: '1.15' },
  brandTitle: { color: surfaces.onDark, fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400, margin: 0 },
  brandSub: { color: surfaces.onDarkSubtle, fontSize: tokens.fontSizeBase100 },
  headerRight: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM },
  viewingAs: { color: surfaces.onDarkMuted, fontSize: tokens.fontSizeBase200 },

  // ── Body + nav ───────────────────────────────────────────────────────────
  body: { display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: 0 },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
    borderRightColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  navContext: {
    paddingLeft: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  navContextDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    marginRight: tokens.spacingHorizontalXS,
  },
  navContextText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.4px',
  },
  navSection: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  navSectionLabel: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    paddingLeft: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: tokens.borderRadiusMedium,
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    fontFamily: tokens.fontFamilyBase,
    position: 'relative',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  navItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    ':hover': { backgroundColor: tokens.colorBrandBackground2 },
    '::before': {
      content: '""',
      position: 'absolute',
      left: '0',
      top: '18%',
      bottom: '18%',
      width: '3px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  navIcon: { display: 'flex', alignItems: 'center', fontSize: '20px', lineHeight: '1' },

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

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ key: 'dashboard', route: '/', label: 'Dashboard', icon: <Board24Regular />, visible: () => true }],
  },
  {
    label: 'Intake',
    items: [
      { key: 'documents', route: '/documents', label: 'Documents', icon: <DocumentMultiple24Regular />, visible: () => true },
    ],
  },
  {
    label: 'Review',
    items: [
      { key: 'review', route: '/review', label: 'Review Queue', icon: <ClipboardTask24Regular />, visible: canReview },
      { key: 'skill-updates', route: '/skill-updates', label: 'Skill Updates', icon: <Wrench24Regular />, visible: canReview },
    ],
  },
  {
    label: 'Admin',
    items: [{ key: 'admin', route: '/admin', label: 'Admin Settings', icon: <Settings24Regular />, visible: isAdmin }],
  },
];

function routeToKey(pathname: string): string {
  if (pathname === '/') return 'dashboard';
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

  const selected = routeToKey(location.pathname);

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.visible(role)),
      })).filter((section) => section.items.length > 0),
    [role],
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden>
            🗂️
          </span>
          <span className={styles.brandText}>
            <h1 className={styles.brandTitle}>Document Intake &amp; Review</h1>
            <span className={styles.brandSub}>Human-in-the-loop document review</span>
          </span>
        </div>

        <div className={styles.headerRight}>
          <Text className={styles.viewingAs}>Viewing as</Text>
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
          <Avatar name={role} color="colorful" aria-label={`Signed in as ${role}`} />
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav} aria-label="Primary">
          <div className={styles.navContext}>
            <span className={styles.navContextDot} aria-hidden />
            <span className={styles.navContextText}>{role.toUpperCase()} WORKSPACE</span>
          </div>

          {sections.map((section) => (
            <div key={section.label} className={styles.navSection}>
              <div className={styles.navSectionLabel}>{section.label}</div>
              {section.items.map((item) => {
                const isSelected = item.key === selected;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={
                      isSelected ? `${styles.navItem} ${styles.navItemSelected}` : styles.navItem
                    }
                    aria-current={isSelected ? 'page' : undefined}
                    onClick={() => navigate(item.route)}
                  >
                    <span className={styles.navIcon} aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
