import React from 'react';

const CENTER = 150;
const RADIUS = 105;

const pointAt = (index, total, value) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const r = (value / 10) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle)
  };
};

const RadarChart = ({ dimensions, values, size = 320 }) => {
  const total = dimensions.length;
  const polygonPoints = dimensions
    .map((d, i) => {
      const v = Math.max(0, Math.min(10, Number(values[d.key]) || 0));
      const p = pointAt(i, total, v);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const gridRings = [2, 4, 6, 8, 10].map(level => {
    const points = dimensions
      .map((_, i) => {
        const p = pointAt(i, total, level);
        return `${p.x},${p.y}`;
      })
      .join(' ');
    return <polygon key={level} points={points} fill="none" stroke="var(--color-border)" strokeWidth="1" />;
  });

  const axes = dimensions.map((d, i) => {
    const p = pointAt(i, total, 10);
    return (
      <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth="1" />
    );
  });

  return (
    <svg width={size} height={size} viewBox="0 0 300 300" role="img" aria-label="Rueda de vida">
      {gridRings}
      {axes}
      <polygon
        points={polygonPoints}
        fill="rgba(var(--color-primary-rgb), 0.18)"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {dimensions.map((d, i) => {
        const v = Math.max(0, Math.min(10, Number(values[d.key]) || 0));
        const p = pointAt(i, total, v);
        const labelP = pointAt(i, total, 11.5);
        return (
          <g key={d.key}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="var(--color-primary)" />
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor={labelP.x > CENTER + 8 ? 'start' : labelP.x < CENTER - 8 ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontSize="10.5"
              fontWeight="600"
              fill="var(--color-text)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default RadarChart;