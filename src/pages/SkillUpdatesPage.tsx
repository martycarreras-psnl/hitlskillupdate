// Skill Updates — tracks Skill Update Requests raised when reviewers reject Documents.
// Shows their processing-status lifecycle (New → In Progress → Completed → Dismissed)
// with filters, and lets a reviewer/admin advance the status. (ADR 0005.)

import { useMemo, useState } from 'react';
import {
  Card,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Select,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title2,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { MoreHorizontal20Regular } from '@fluentui/react-icons';
import { useSkillUpdateRequests, useUpdateSkillUpdateRequest } from '@/hooks/useDocuments';
import { SkillUpdateStatus } from '@/types/domain-models';
import { ALL_SKILL_UPDATE_STATUSES, skillUpdateStatusLabels } from '@/constants/status';
import { SkillUpdateStatusBadge } from '@/components/StatusBadge';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { EmptyState, LoadingState } from '@/components/EmptyState';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  filters: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  fix: { color: tokens.colorNeutralForeground2 },
  number: { fontFamily: tokens.fontFamilyMonospace, whiteSpace: 'nowrap' },
  docLink: { cursor: 'pointer' },
});

const TERMINAL = new Set([SkillUpdateStatus.Completed, SkillUpdateStatus.Dismissed]);

function nextStatuses(current: SkillUpdateStatus): SkillUpdateStatus[] {
  return ALL_SKILL_UPDATE_STATUSES.filter((s) => s !== current);
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function SkillUpdatesPage() {
  const styles = useStyles();
  const { data: requests, isLoading } = useSkillUpdateRequests();
  const updateRequest = useUpdateSkillUpdateRequest();

  const [statusFilter, setStatusFilter] = useState<'all' | SkillUpdateStatus>('all');
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      (requests ?? []).filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [requests, statusFilter],
  );

  function setStatus(id: string, status: SkillUpdateStatus) {
    const resolvedOn = TERMINAL.has(status) ? new Date().toISOString() : undefined;
    updateRequest.mutate({ id, changes: { status, resolvedOn } });
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title2>Skill Updates</Title2>
        <div className={styles.filters}>
          <Select
            aria-label="Filter by status"
            value={String(statusFilter)}
            onChange={(_e, data) =>
              setStatusFilter(
                data.value === 'all' ? 'all' : (Number(data.value) as SkillUpdateStatus),
              )
            }
          >
            <option value="all">All statuses</option>
            {ALL_SKILL_UPDATE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {skillUpdateStatusLabels[status]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🛠️"
            title="No skill update requests"
            description="Requests appear here when a reviewer rejects a document and suggests a fix for the agent skill."
          />
        ) : (
          <Table aria-label="Skill update requests">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Number</TableHeaderCell>
                <TableHeaderCell>Suggested Fix</TableHeaderCell>
                <TableHeaderCell>Document</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Requested</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <span className={styles.number}>{req.skillUpdateNumber ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout truncate>
                      <Text className={styles.fix}>{req.suggestedFix}</Text>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <Button
                      appearance="transparent"
                      size="small"
                      className={styles.docLink}
                      onClick={() => setPreviewDocId(req.documentId)}
                    >
                      {req.documentName ?? req.documentId}
                    </Button>
                  </TableCell>
                  <TableCell>{req.documentTypeName ?? '—'}</TableCell>
                  <TableCell>
                    <SkillUpdateStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell>{formatDate(req.requestedOn)}</TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger disableButtonEnhancement>
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<MoreHorizontal20Regular />}
                          aria-label={`Change status for ${req.name}`}
                        />
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          {nextStatuses(req.status).map((status) => (
                            <MenuItem key={status} onClick={() => setStatus(req.id, status)}>
                              Mark {skillUpdateStatusLabels[status]}
                            </MenuItem>
                          ))}
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <DocumentPreviewDialog
        documentId={previewDocId}
        open={previewDocId !== null}
        onClose={() => setPreviewDocId(null)}
      />
    </div>
  );
}
