import React from 'react';

interface Props {
  status: string;
}

const labelMap: Record<string, string> = {
  open: 'Open',
  analyzing: 'Analyzing',
  analyzed: 'Analyzed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const s = (status || '').toLowerCase();
  const label = labelMap[s] || status;
  return (
    <span className={`status-badge status-${s}`}>
      {label}
    </span>
  );
};
