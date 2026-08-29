import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Eye, Sparkles, Maximize2 } from 'lucide-react';

const TABS = [
  { id: 'structure', emoji: '🧬', label: 'Bi-Layer Matrix' },
  { id: 'coating',   emoji: '🛡️', label: 'Enteric Coating' },
  { id: 'specs',     emoji: '⚡', label: 'Quality Specs'   },
];

const TAB_CONTENT = {
  structure: {
    title: 'Bi-Layer Architecture',
    color: 'var(--teal-light)',
    text: 'Layer 1 provides immediate API dissolution (300 mg within 15 min), while Layer 2 delivers sustained release (200 mg over 8 hrs).',
    specs: [
      { label: 'Immediate Layer', value: '300 mg', color: 'var(--teal-light)' },
      { label: 'Sustained Layer', value: '200 mg', color: 'var(--pharma-blue-light)' },
      { label: 'Release Profile', value: 'Biphasic', color: 'var(--success-light)' },
    ],
  },
  coating: {
    title: 'Functional Polymer Coating',
    color: 'var(--success-light)',
    text: 'Hypromellose phthalate film protects active API against stomach acidity and enhances smooth patient swallowability.',
    specs: [
      { label: 'Polymer',    value: 'HPMC-P',   color: 'var(--success-light)' },
      { label: 'Weight Gain', value: '3.2%',    color: 'var(--teal-light)' },
      { label: 'pH Trigger', value: '>5.5',     color: 'var(--warning-light)' },
    ],
  },
  specs: {
    title: 'Pharmacopeial Tolerances',
    color: 'var(--warning-light)',
    text: 'Friability < 0.5%, Content Uniformity 98.5% – 101.5%, Dissolution Rate Q = 80% at 30 min (USP Standard).',
    specs: [
      { label: 'Friability',   value: '< 0.5%',          color: 'var(--success-light)' },
      { label: 'Content Unif', value: '98.5–101.5%',     color: 'var(--teal-light)' },
      { label: 'Dissolution',  value: 'Q=80% at 30 min', color: 'var(--warning-light)' },
    ],
  },
};

export default function Tablet3DViewer({
  tabletName = 'Paracetamol 500 mg',
  batchCode  = 'BATCH-JSS-2026-904',
}) {
  const canvasRef  = useRef(null);
  const [rotation, setRotation]     = useState({ x: 0.3, y: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeTab, setActiveTab]   = useState('structure');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    let rotX = rotation.x;
    let rotY = rotation.y;

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const rX = 105;
      const rY = 52;
      const thickness = 32;

      ctx.clearRect(0, 0, W, H);

      if (autoRotate && !isDragging) rotY += 0.007;

      // Ambient background glow
      const bgGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 200);
      bgGlow.addColorStop(0, 'rgba(6,182,212,0.12)');
      bgGlow.addColorStop(0.5, 'rgba(0,102,204,0.04)');
      bgGlow.addColorStop(1, 'rgba(4,8,18,0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, W, H);

      // Orbital ring guide
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, rX + 32, (rY + 32) * Math.abs(Math.sin(rotX)), 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6,182,212,0.15)';
      ctx.setLineDash([3, 8]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Drop shadow
      ctx.beginPath();
      ctx.ellipse(0, 76, rX * 0.88, rY * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.filter = 'blur(6px)';
      ctx.fill();
      ctx.filter = 'none';

      // Bi-layer extrusion slices
      for (let slice = -thickness / 2; slice <= thickness / 2; slice += 1.5) {
        const oy    = slice * cosX + Math.sin(rotY + slice * 0.04) * 3.5;
        const ox    = slice * sinX * sinY;
        const scale = 1 - Math.abs(slice) / (thickness * 2.6);

        ctx.beginPath();
        ctx.ellipse(
          ox, oy,
          rX * scale,
          rY * scale * Math.abs(cosX),
          rotY * 0.08,
          0, Math.PI * 2
        );

        const isTopLayer = slice < 0;
        let grad;
        if (isTopLayer) {
          grad = ctx.createLinearGradient(-rX, -rY, rX, rY);
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(0.45, '#e2e8f0');
          grad.addColorStop(1, '#94a3b8');
        } else {
          grad = ctx.createLinearGradient(-rX, -rY, rX, rY);
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(0.45, '#0066cc');
          grad.addColorStop(1, '#1e3a5f');
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isTopLayer ? 'rgba(255,255,255,0.35)' : 'rgba(56,189,248,0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Score line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -rY * 0.38 * cosX);
      ctx.lineTo(0, rY * 0.38 * cosX);
      ctx.strokeStyle = 'rgba(71,85,105,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Embossed text
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      ctx.font = 'bold 14px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JSS', -28 * cosY, 0);
      ctx.fillText('500', 28 * cosY, 0);
      ctx.restore();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotation, autoRotate, isDragging]);

  const handleMouseDown = e => {
    setIsDragging(true);
    setAutoRotate(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = e => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) * 0.008;
    const dy = (e.clientY - dragStart.y) * 0.008;
    setRotation(prev => ({
      x: Math.max(-1, Math.min(1, prev.x + dy)),
      y: prev.y + dx,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  const tabData = TAB_CONTENT[activeTab];

  return (
    <div
      className="glass-panel hud-border"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient bg glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles
            aria-hidden="true"
            className="animate-status"
            style={{ width: 15, height: 15, color: 'var(--teal)' }}
          />
          <h3 className="type-subhead" style={{ fontSize: 13 }}>
            3D Digital Twin Inspector
          </h3>
        </div>
        <span className="hud-tag" style={{ fontSize: 9 }}>{batchCode}</span>
      </div>

      {/* Canvas area */}
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(4,8,18,0.7)',
          border: '1px solid rgba(6,182,212,0.18)',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="img"
        aria-label={`Interactive 3D model of ${tabletName}. Drag to rotate.`}
      >
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(6,182,212,0.015) 3px, rgba(6,182,212,0.015) 4px)',
          pointerEvents: 'none',
          zIndex: 2,
        }} aria-hidden="true" />

        <canvas
          ref={canvasRef}
          width={440}
          height={240}
          style={{ width: '100%', maxWidth: 440, height: 240, display: 'block' }}
        />

        {/* Specs overlay */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(4,8,18,0.82)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(6,182,212,0.22)',
          padding: '8px 11px',
          zIndex: 3,
          minWidth: 140,
        }}>
          <div className="type-label" style={{ color: 'var(--teal)', marginBottom: 5, fontSize: 9 }}>
            Formulation Specs
          </div>
          {[
            { k: 'Active',    v: 'Paracetamol 500mg',        c: '#ffffff' },
            { k: 'Format',    v: 'Bi-Layer Modified Release', c: '#4ade80' },
            { k: 'Weight',    v: '585 mg ± 2%',              c: '#fbbf24' },
            { k: 'Hardness',  v: '8.4 kp',                   c: '#22d3ee' },
          ].map(({ k, v, c }) => (
            <div key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 2 }}>
              <span style={{ color: '#cbd5e1' }}>{k}: </span>
              <span style={{ color: c, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Floating controls */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 5, zIndex: 3 }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              width: 30, height: 30,
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${autoRotate ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: autoRotate ? 'rgba(6,182,212,0.15)' : 'rgba(8,14,30,0.7)',
              color: autoRotate ? 'var(--teal)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition-fast)',
              backdropFilter: 'blur(8px)',
            }}
            title="Toggle auto-rotation"
            aria-label={autoRotate ? 'Stop auto-rotation' : 'Start auto-rotation'}
            aria-pressed={autoRotate}
          >
            <RotateCw
              aria-hidden="true"
              style={{ width: 13, height: 13, animation: autoRotate ? 'spin 2s linear infinite' : 'none' }}
            />
          </button>
          <button
            onClick={() => setRotation({ x: 0.3, y: 0.8 })}
            style={{
              width: 30, height: 30,
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(8,14,30,0.7)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition-fast)',
              backdropFilter: 'blur(8px)',
            }}
            title="Reset view"
            aria-label="Reset tablet to default orientation"
          >
            <Eye aria-hidden="true" style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, zIndex: 1 }}
        role="tablist"
        aria-label="Tablet inspection views"
      >
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '7px 8px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${activeTab === t.id ? 'rgba(6,182,212,0.5)' : 'var(--border-color)'}`,
              background: activeTab === t.id ? 'rgba(6,182,212,0.12)' : 'var(--bg-base)',
              color: activeTab === t.id ? 'var(--teal-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 10.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'var(--transition-fast)',
              boxShadow: activeTab === t.id ? '0 0 10px rgba(6,182,212,0.15)' : 'none',
            }}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 1,
        }}
      >
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11.5,
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: tabData.color }}>{tabData.title}: </strong>
          {tabData.text}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          {tabData.specs.map(s => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span className="type-caption" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: s.color, fontWeight: 700 }}>
                {s.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
