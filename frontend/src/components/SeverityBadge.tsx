import React from 'react';

interface Props {
  severity: string;
}

export const SeverityBadge: React.FC<Props> = ({ severity }) => {
  const s = (severity || '').toLowerCase();
  return (
    <span className={`severity-badge severity-${s}`}>
      {severity.toUpperCase()}
    </span>
  );
};
