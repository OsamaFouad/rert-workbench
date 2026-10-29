import type { Status } from '../../engine';

export const STATUS_TEXT: Record<Status, string> = {
  within: 'Within selected constraints',
  exceeds: 'Exceeds selected constraints',
  insufficient: 'Insufficient data',
  review: 'Requires review',
};
const ICON: Record<Status, string> = { within: '✓', exceeds: '✕', insufficient: '?', review: '!' };

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status ${status}`} data-status={status}>
      <span className="ico" aria-hidden="true">{ICON[status]}</span>
      {STATUS_TEXT[status]}
    </span>
  );
}

export const NOT_CLEARANCE =
  '“Within selected constraints” means only that the entered numbers satisfy the selected reference values under the stated assumptions. It is not clinical clearance and not proof of safety.';
