import React from 'react';

const Skeleton = ({ width, height = '1rem', borderRadius = '4px', style, ...props }) => (
  <div
    style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, var(--color-surface-hover) 25%, var(--color-border) 50%, var(--color-surface-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      ...style,
    }}
    {...props}
  />
);

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '1rem' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={`${100 / cols}%`} height="1.5rem" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
      <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '1rem' }} />
      <Skeleton width="100%" height="0.75rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="100%" height="0.75rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  );
}

export default Skeleton;
