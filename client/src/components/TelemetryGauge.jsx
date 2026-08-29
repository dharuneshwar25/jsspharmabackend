import React from 'react';

export default function TelemetryGauge({
  label  = 'Impeller Speed',
  value  = 450,
  min    = 300,
  max    = 600,
  unit   = 'RPM',
  status = 'normal', // normal | warning | alarm
}) {
  const clamped    = Math.min(Math.max(value, min), max);
  const percentage = ((clamped - min) / (max - min)) * 100;

  // Arc geometry (three-quarter circle)
  const radius        = 34;
  const circumference = 2 * Math.PI * radius;
  const arcLength     = circumference * 0.75;
  const dashOffset    = circumference - (percentage / 100) * arcLength;

  const PALETTE = {
    normal:  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.22)',  text: '#22d3ee',  glow: '0 0 10px rgba(6,182,212,0.2)'  },
    warning: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)',  text: '#fbbf24',  glow: '0 0 12px rgba(245,158,11,0.25)' },
    alarm:   { stroke: '#ef4444', fill: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171',  glow: '0 0 14px rgba(239,68,68,0.35)'  },
  };

  const pal = PALETTE[status] || PALETTE.normal;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '10px 12px 8px',
        borderRadius: 8,
        background: '#000000',
        border: '2.5px solid #000000',
        boxShadow: `3px 3px 0px 0px ${status === 'alarm' ? 'var(--danger)' : 'var(--neon-accent)'}`,
        transition: 'all 0.15s ease',
        minWidth: 95,
      }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`${label}: ${value} ${unit}`}
    >
      {/* Label */}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 80,
      }}>
        {label}
      </span>

      {/* SVG Gauge */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg
          width="80" height="80"
          viewBox="0 0 80 80"
          style={{ transform: 'rotate(-135deg)', display: 'block' }}
          aria-hidden="true"
        >
          {/* Track arc */}
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
          />

          {/* Value arc */}
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke={pal.stroke}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease',
              filter: `drop-shadow(0 0 4px ${pal.stroke}80)`,
            }}
          />

          {/* Tick marks at 0%, 50%, 100% */}
          {[0, 0.5, 1].map((t, i) => {
            const angle = (-135 + t * 270) * (Math.PI / 180);
            const inner = radius - 10;
            const outer = radius - 5;
            const x1 = 40 + inner * Math.cos(angle);
            const y1 = 40 + inner * Math.sin(angle);
            const x2 = 40 + outer * Math.cos(angle);
            const y2 = 40 + outer * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center value overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            fontWeight: 700,
            color: pal.text,
            lineHeight: 1,
            transition: 'color 0.3s ease',
          }}>
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {unit}
          </span>
        </div>
      </div>

      {/* Min/Max labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        fontFamily: 'var(--font-mono)',
        fontSize: 8.5,
        color: 'var(--text-muted)',
        paddingTop: 2,
      }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
