import React, { useEffect, useRef } from 'react';
import { Activity, Gauge, Cpu } from 'lucide-react';

export default function Machinery3DCanvas({ stageName = "Granulation", machineStatus = "running" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;
    let angle = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      if (machineStatus === 'running') {
        angle += 0.04;
      } else if (machineStatus === 'paused') {
        angle += 0.005;
      }

      // Background Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy);

      if (stageName.includes('Compression') || stageName.includes('Rotary')) {
        // Render Rotary Tablet Press Turret
        const outerRadius = 70;
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#0072ce';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, outerRadius - 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
        ctx.fill();

        // Punch Dies around turret
        const punchCount = 8;
        for (let i = 0; i < punchCount; i++) {
          const a = angle + (i * Math.PI * 2) / punchCount;
          const px = Math.cos(a) * (outerRadius - 15);
          const py = Math.sin(a) * (outerRadius - 15);

          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (stageName.includes('Granulation') || stageName.includes('Milling')) {
        // Render High-Shear Mixer Granulator Impeller
        ctx.beginPath();
        ctx.arc(0, 0, 65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Rotating Impeller Blades
        ctx.save();
        ctx.rotate(angle);
        for (let i = 0; i < 3; i++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(25, 20, 55, 5);
          ctx.lineTo(45, -10);
          ctx.closePath();
          ctx.fillStyle = 'linear-gradient(135deg, #06b6d4, #0072ce)';
          ctx.fillStyle = '#06b6d4';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Render General Pharmaceutical Reactor / Dryer Vessel
        ctx.beginPath();
        ctx.roundRect(-50, -60, 100, 120, 20);
        ctx.fillStyle = 'rgba(13, 22, 48, 0.85)';
        ctx.fill();
        ctx.strokeStyle = '#0072ce';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pulsing fluid liquid level
        const waveY = Math.sin(angle * 2) * 6;
        ctx.beginPath();
        ctx.moveTo(-45, 10 + waveY);
        ctx.quadraticCurveTo(0, 20 - waveY, 45, 10 + waveY);
        ctx.lineTo(45, 50);
        ctx.lineTo(-45, 50);
        ctx.closePath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.fill();
      }

      ctx.restore();

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [stageName, machineStatus]);

  return (
    <div className="bg-slate-950/70 rounded-xl p-3 border border-cyan-500/20 flex flex-col gap-2 relative">
      <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
        <span className="flex items-center gap-1.5 font-bold">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          MACHINE DIGITAL TWIN
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          machineStatus === 'running' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
          machineStatus === 'paused' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
          'bg-slate-800 text-slate-400'
        }`}>
          {machineStatus}
        </span>
      </div>

      <div className="flex justify-center items-center relative">
        <canvas ref={canvasRef} width={280} height={160} className="w-full h-[160px] object-contain" />
      </div>
    </div>
  );
}
