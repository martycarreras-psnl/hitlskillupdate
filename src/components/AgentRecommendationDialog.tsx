// View / edit the agent's recommendation for a Skill Update Request. The recommendation
// is verbose, so it lives behind a button on the list and opens here. It is populated by
// the agent and editable by a reviewer/admin before the skill is updated.
// (Dataverse memo column msfthitl_agentrecommendation.)

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  Text,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DataverseFieldLabel } from '@/components/DataverseFieldLabel';
import { useUpdateSkillUpdateRequest } from '@/hooks/useDocuments';
import type { SkillUpdateRequest } from '@/types/domain-models';

const SKILL_UPDATE_TABLE = 'msfthitl_skillupdaterequest';
const AGENT_RECOMMENDATION_FIELD = 'msfthitl_agentrecommendation';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: '520px' },
  context: { color: tokens.colorNeutralForeground2 },
  empty: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
});

export interface AgentRecommendationDialogProps {
  request: SkillUpdateRequest | null;
  open: boolean;
  onClose: () => void;
}

export function AgentRecommendationDialog({ request, open, onClose }: AgentRecommendationDialogProps) {
  const styles = useStyles();
  const updateRequest = useUpdateSkillUpdateRequest();
  const [text, setText] = useState('');

  // Seed the editor from the record each time the dialog opens.
  useEffect(() => {
    if (open) setText(request?.agentRecommendation ?? '');
  }, [open, request?.agentRecommendation]);

  function save() {
    if (!request) return;
    const next = text.trim();
    updateRequest.mutate(
      { id: request.id, changes: { agentRecommendation: next } },
      { onSuccess: onClose },
    );
  }

  const title = request?.skillUpdateNumber
    ? `Agent recommendation · ${request.skillUpdateNumber}`
    : 'Agent recommendation';

  return (
    <Dialog open={open} onOpenChange={(_e, data) => (!data.open ? onClose() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <div className={styles.body}>
              {request?.suggestedFix ? (
                <Text size={200} className={styles.context}>
                  Based on the reviewer's suggested fix: “{request.suggestedFix}”
                </Text>
              ) : null}
              <DataverseFieldLabel
                tableLogicalName={SKILL_UPDATE_TABLE}
                fieldLogicalName={AGENT_RECOMMENDATION_FIELD}
                fallback="Agent Recommendation"
                htmlFor="agent-recommendation"
              />
              <Textarea
                id="agent-recommendation"
                value={text}
                placeholder="The agent's recommendation for how to update the skill will appear here. You can edit it before the skill is updated."
                resize="vertical"
                rows={14}
                aria-label="Agent recommendation"
                onChange={(_e, data) => setText(data.value)}
              />
              {!text.trim() ? (
                <Text size={200} className={styles.empty}>
                  No recommendation captured yet.
                </Text>
              ) : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" disabled={updateRequest.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={updateRequest.isPending ? <Spinner size="tiny" /> : undefined}
              disabled={updateRequest.isPending || !request}
              onClick={save}
            >
              Save
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
