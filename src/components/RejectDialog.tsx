// Rejection dialog. Shown only when a reviewer rejects a Document. Captures what the
// reviewer thinks should be improved in the underlying agent skill (the Suggested Fix),
// which is required. Confirming raises a Skill Update Request. (ADR 0005.)

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Spinner,
  Textarea,
} from '@fluentui/react-components';

export interface RejectDialogProps {
  open: boolean;
  documentName: string;
  submitting?: boolean;
  onConfirm: (suggestedFix: string) => void;
  onCancel: () => void;
}

export function RejectDialog({
  open,
  documentName,
  submitting,
  onConfirm,
  onCancel,
}: RejectDialogProps) {
  const [text, setText] = useState('');
  const [showError, setShowError] = useState(false);

  // Reset the field each time the dialog opens.
  useEffect(() => {
    if (open) {
      setText('');
      setShowError(false);
    }
  }, [open]);

  function confirm() {
    if (!text.trim()) {
      setShowError(true);
      return;
    }
    onConfirm(text.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(_e, data) => (!data.open ? onCancel() : undefined)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Reject &amp; suggest a skill update</DialogTitle>
          <DialogContent>
            <Field
              label={`What should be improved in the agent's skill so it handles documents like "${documentName}" correctly?`}
              required
              validationState={showError ? 'error' : 'none'}
              validationMessage={showError ? 'A suggested fix is required to reject.' : undefined}
            >
              <Textarea
                value={text}
                placeholder="Describe what the agent skill got wrong and how it should change…"
                resize="vertical"
                rows={5}
                aria-label="Suggested fix for the agent skill"
                onChange={(_e, data) => {
                  setText(data.value);
                  if (data.value.trim()) setShowError(false);
                }}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" disabled={submitting} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={submitting ? <Spinner size="tiny" /> : undefined}
              disabled={submitting}
              onClick={confirm}
            >
              Reject &amp; raise request
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
