import { useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Subtitle1,
  Subtitle2,
  Text,
  Title1,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular,
  Clipboard24Regular,
  Checkmark24Regular,
} from '@fluentui/react-icons';

type Path = null | 'new-tables' | 'existing-tables';

// ── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    gap: tokens.spacingVerticalXXL,
    boxSizing: 'border-box',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: tokens.spacingVerticalM,
    maxWidth: '720px',
  },
  burst: {
    fontSize: '72px',
    lineHeight: '1',
    display: 'block',
    animationName: {
      '0%': { transform: 'scale(0.5) rotate(-10deg)', opacity: '0' },
      '60%': { transform: 'scale(1.25) rotate(4deg)', opacity: '1' },
      '80%': { transform: 'scale(0.95) rotate(-2deg)' },
      '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
    },
    animationDuration: '0.9s',
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  appName: {
    color: tokens.colorBrandForeground1,
  },
  tagline: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '600px',
  },
  question: {
    color: tokens.colorNeutralForeground1,
    marginTop: tokens.spacingVerticalL,
  },
  paths: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingHorizontalL,
    width: '100%',
    maxWidth: '800px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow16,
    cursor: 'pointer',
    transitionProperty: 'box-shadow, transform',
    transitionDuration: '0.2s',
    ':hover': {
      boxShadow: tokens.shadow28,
      transform: 'translateY(-2px)',
    },
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  cardEmoji: {
    fontSize: '32px',
    lineHeight: '1',
  },
  cardBody: {
    color: tokens.colorNeutralForeground2,
  },
  // Next-steps detail view
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    width: '100%',
    maxWidth: '800px',
  },
  stepCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
  },
  stepNumber: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase300,
    flexShrink: 0,
  },
  stepHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  stepBody: {
    color: tokens.colorNeutralForeground2,
    paddingLeft: '44px',
  },
  prompt: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderLeftStyle: 'solid',
    borderLeftWidth: '3px',
    borderLeftColor: tokens.colorBrandStroke1,
    marginLeft: '44px',
    position: 'relative',
  },
  promptLabel: {
    display: 'block',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalXS,
  },
  promptText: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForeground1,
  },
  copyButton: {
    position: 'absolute',
    top: tokens.spacingVerticalXS,
    right: tokens.spacingHorizontalXS,
  },
  backRow: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
  },
  goldenPath: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusXLarge,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
  },
  step: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  arrow: {
    color: tokens.colorNeutralForeground4,
  },
  divider: {
    width: '100%',
    maxWidth: '800px',
  },
  footer: {
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    maxWidth: '560px',
  },
  // Fresh-eyes review callout (shown on the choice screen)
  reviewCallout: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    width: '100%',
    maxWidth: '800px',
    padding: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorBrandBackground2,
    borderLeftStyle: 'solid',
    borderLeftWidth: '4px',
    borderLeftColor: tokens.colorBrandStroke1,
    boxShadow: tokens.shadow8,
    boxSizing: 'border-box',
  },
  reviewHead: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  reviewEmoji: {
    fontSize: '28px',
    lineHeight: '1',
    flexShrink: 0,
  },
  reviewLabel: {
    display: 'block',
    fontSize: tokens.fontSizeBase100,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  reviewBody: {
    color: tokens.colorNeutralForeground2,
  },
  reviewPrompt: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    position: 'relative',
  },
});

// ── Copy-to-clipboard button ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button
      className={styles.copyButton}
      appearance="subtle"
      size="small"
      icon={copied ? <Checkmark24Regular /> : <Clipboard24Regular />}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      onClick={handleCopy}
    />
  );
}

// ── Step card ───────────────────────────────────────────────────────────────

interface StepProps {
  number: number;
  title: string;
  description: string;
  agentPrompt?: string;
}

function StepItem({ number, title, description, agentPrompt }: StepProps) {
  const styles = useStyles();

  return (
    <Card className={styles.stepCard}>
      <div className={styles.stepHead}>
        <span className={styles.stepNumber}>{number}</span>
        <Subtitle2>{title}</Subtitle2>
      </div>
      <Text className={styles.stepBody}>{description}</Text>
      {agentPrompt && (
        <div className={styles.prompt}>
          <span className={styles.promptLabel}>Paste this in your agent chat:</span>
          <Text className={styles.promptText}>{agentPrompt}</Text>
          <CopyButton text={agentPrompt} />
        </div>
      )}
    </Card>
  );
}

// ── Next steps: New tables (idea-first) ─────────────────────────────────────

function NewTablesSteps() {
  const styles = useStyles();

  return (
    <div className={styles.stepsContainer}>
      <div className={styles.hero}>
        <Title2>Building something new</Title2>
        <Text className={styles.tagline}>
          You have a business problem but no data model yet. Here is the path from idea
          to working app — each step feeds the next.
        </Text>
      </div>

      <StepItem
        number={1}
        title="Describe your business problem"
        description="Open VS Code, start a chat with your coding agent, and describe what you want to build in plain language. The agent will decompose your narrative into business dimensions — roles, workflows, approvals, data, and reporting — without jumping to implementation."
        agentPrompt="I want to build a [describe your app]. Help me plan it as a Power Apps Code App. Walk me through business problem decomposition first — don't jump to code."
      />

      <StepItem
        number={2}
        title="Grill the plan"
        description="Once the agent has a draft understanding, ask it to grill you. It will challenge your assumptions one question at a time, sharpen your terminology into a CONTEXT.md glossary, and surface decisions that need recording as ADRs. This is where fuzzy ideas become precise requirements."
        agentPrompt="Grill me on this plan. Challenge my assumptions one question at a time, sharpen the terminology, and build the CONTEXT.md glossary as we go."
      />

      <StepItem
        number={3}
        title="Generate the planning payload"
        description="When the scope is stable, the agent translates your refined narrative into a Dataverse planning payload — candidate tables, columns, relationships, and lifecycle states. Every entity traces back to a glossary term in CONTEXT.md."
        agentPrompt="The scope is stable. Translate it into a Dataverse planning payload. Make sure every entity traces back to a CONTEXT.md term."
      />

      <StepItem
        number={4}
        title="Build a clickable prototype"
        description="Before provisioning any Dataverse schema, the agent scaffolds a mock-data-backed prototype you can click through. This validates the UX against real business scenarios without touching your environment."
        agentPrompt="Build a clickable prototype against mock data so I can validate the UX before we create any Dataverse tables."
      />

      <StepItem
        number={5}
        title="Connect and deploy"
        description="Once the prototype validates, provision the Dataverse schema, register data sources with pac code add-data-source, swap mock providers for real ones, and deploy with pac code push."
        agentPrompt="The prototype looks good. Provision the Dataverse schema from the planning payload, register the data sources, and help me deploy."
      />

      <Divider className={styles.divider} />

      <div className={styles.goldenPath} role="list" aria-label="The golden path">
        <Text className={styles.step}>📋 Plan</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔥 Grill</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🖼️ Prototype</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔌 Connect</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🚀 Deploy</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔁 Iterate</Text>
      </div>
    </div>
  );
}

// ── Next steps: Existing tables (data-first) ────────────────────────────────

function ExistingTablesSteps() {
  const styles = useStyles();

  return (
    <div className={styles.stepsContainer}>
      <div className={styles.hero}>
        <Title2>Building on existing data</Title2>
        <Text className={styles.tagline}>
          You already have Dataverse tables, a SharePoint list, or a data model. Here is the
          fastest path from existing schema to a working Code App.
        </Text>
      </div>

      <StepItem
        number={1}
        title="Discover your existing schema"
        description="Open VS Code and ask your agent to examine what already exists in your environment. It will query Dataverse metadata, identify tables, columns, relationships, and OOB entities you can reuse — so you don't accidentally recreate something that already exists."
        agentPrompt="Examine my Dataverse environment and show me what tables, columns, and relationships already exist. Highlight any OOB entities I should reuse instead of recreating."
      />

      <StepItem
        number={2}
        title="Build the glossary from your schema"
        description="The agent reverse-engineers a CONTEXT.md glossary from your existing tables — mapping Dataverse display names to canonical business terms. This grounds all future development in your actual data model."
        agentPrompt="Build a CONTEXT.md glossary from my existing Dataverse tables. Map each table and key column to a canonical business term."
      />

      <StepItem
        number={3}
        title="Grill for gaps"
        description="Even with existing tables, there are usually gaps — missing relationships, lifecycle states that aren't modelled, or new entities needed for the app you're building. The grilling process surfaces these before you write any UI code."
        agentPrompt="Grill me on whether my existing schema is complete for the app I want to build. Surface any gaps — missing tables, columns, relationships, or lifecycle states."
      />

      <StepItem
        number={4}
        title="Register data sources and prototype"
        description="Register your existing tables with pac code add-data-source to generate TypeScript services. Then scaffold a prototype backed by real data — you get a working app against your actual schema immediately."
        agentPrompt="Register my existing Dataverse tables as data sources and scaffold a prototype using the generated services. Show me real data from my environment."
      />

      <StepItem
        number={5}
        title="Iterate and deploy"
        description="Refine the UI, add any new tables the grilling process identified, and deploy. Each iteration follows the same loop — plan any changes, grill the plan, prototype, connect, deploy."
        agentPrompt="The prototype is working. Help me refine the UI and deploy to my environment with pac code push."
      />

      <Divider className={styles.divider} />

      <div className={styles.goldenPath} role="list" aria-label="The golden path">
        <Text className={styles.step}>🔍 Discover</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>📖 Glossary</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔥 Grill</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔌 Connect</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🚀 Deploy</Text>
        <Text className={styles.arrow}>→</Text>
        <Text className={styles.step}>🔁 Iterate</Text>
      </div>
    </div>
  );
}

// ── Fresh-eyes review callout ───────────────────────────────────────────────

function ReviewCallout() {
  const styles = useStyles();
  const reviewPrompt =
    "I just finished the initial implementation of this Power Apps Code App, based on a plan we made earlier. Before I start functional testing, do a complete review of the implementation in a fresh pass. First read the plan artifacts that live in the repo — CONTEXT.md, dataverse/planning-payload.json, and any ADRs in docs/adr — then read AGENTS.md and the project's agent instruction files. Audit the codebase against both: does the implementation match what we planned, and does it follow the rules (architecture layering, the read-only src/generated rule, HashRouter, the DataverseFieldLabel form-field pattern, security)? Give me a prioritized findings list — gaps from the plan, rule violations, and bugs — before we change anything.";

  return (
    <div className={styles.reviewCallout}>
      <div className={styles.reviewHead}>
        <span className={styles.reviewEmoji} role="img" aria-label="Magnifying glass">
          🔍
        </span>
        <div>
          <span className={styles.reviewLabel}>A tip for later</span>
          <Subtitle2>After the build, get a fresh-eyes review before you test</Subtitle2>
        </div>
      </div>
      <Text className={styles.reviewBody}>
        Once your coding agent finishes the initial implementation, resist diving straight into
        functional testing. Start a brand new agent session and ask for a complete review of the
        implementation against your plan. A clean context window catches gaps, rule violations,
        and bugs that the same session that wrote the code tends to miss.
      </Text>
      <div className={styles.reviewPrompt}>
        <span className={styles.promptLabel}>Paste this into a fresh agent session:</span>
        <Text className={styles.promptText}>{reviewPrompt}</Text>
        <CopyButton text={reviewPrompt} />
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export function App() {
  const styles = useStyles();
  const [selectedPath, setSelectedPath] = useState<Path>(null);

  // ── Detail view (after a choice is made) ──
  if (selectedPath) {
    return (
      <div className={styles.root}>
        <div className={styles.backRow}>
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={() => setSelectedPath(null)}
          >
            Back
          </Button>
        </div>

        {selectedPath === 'new-tables' ? <NewTablesSteps /> : <ExistingTablesSteps />}

        <Text className={styles.footer}>
          Every iteration brings you back to this loop. This screen is your pitstop, not
          your finish line. 🏁
        </Text>
      </div>
    );
  }

  // ── Choice screen ──
  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <span className={styles.burst} role="img" aria-label="Party popper">
          🎉
        </span>
        <Title1 as="h1">
          <span className={styles.appName}>HITL Skill Improvement</span> is live!
        </Title1>
        <Subtitle1 as="p" className={styles.tagline}>
          You just deployed a real Power Apps Code App to Dataverse. That is not a demo —
          that is a production-grade Microsoft 365 integration running on your tenant.
        </Subtitle1>
      </div>

      <ReviewCallout />

      <Title3 className={styles.question}>What are you building?</Title3>

      <div className={styles.paths}>
        <Card
          className={styles.card}
          onClick={() => setSelectedPath('new-tables')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedPath('new-tables')}
        >
          <div className={styles.cardHead}>
            <span className={styles.cardEmoji}>🧠</span>
            <Title3>A brand new app</Title3>
          </div>
          <Text className={styles.cardBody}>
            I have a business problem or app idea. I need to design the data model, plan
            the workflows, and build from scratch.
          </Text>
        </Card>

        <Card
          className={styles.card}
          onClick={() => setSelectedPath('existing-tables')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSelectedPath('existing-tables')}
        >
          <div className={styles.cardHead}>
            <span className={styles.cardEmoji}>📊</span>
            <Title3>An app on existing data</Title3>
          </div>
          <Text className={styles.cardBody}>
            I already have Dataverse tables, a SharePoint list, or a data model. I want to
            build a new Code App on top of what I have.
          </Text>
        </Card>
      </div>

      <Divider className={styles.divider} />

      <Text className={styles.footer}>
        Pick a path and we will show you exactly what to ask your coding agent in VS Code
        to get started. You can always come back.
      </Text>
    </div>
  );
}
