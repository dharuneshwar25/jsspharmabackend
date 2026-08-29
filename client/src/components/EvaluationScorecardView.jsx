import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, Download, CheckCircle2, AlertTriangle, XCircle, FileText, ClipboardList } from 'lucide-react';
import { useSimStore } from '../store';

export default function EvaluationScorecardView() {
  const { batchState, qmsScores } = useSimStore();
  const [activeTab, setActiveTab] = useState('vm');
  const vmScores = batchState?.stepScores || [];
  const loadingScores = false;
  // Aggregate VM Operator Checkpoints
  const vmTotalScore = vmScores.reduce((acc, curr) => acc + curr.marks_awarded, 0);
  const vmTotalMax = vmScores.reduce((acc, curr) => acc + curr.marks_max, 0);

  // Aggregate QMS Decision Checkpoints
  const quizScoresArray = Object.values(qmsScores || {});
  const qmsTotalScore = quizScoresArray.reduce((acc, curr) => acc + curr.score, 0);
  const qmsTotalMax = quizScoresArray.reduce((acc, curr) => acc + curr.maxScore, 0);

  // Combined totals
  const grandTotalScore = vmTotalScore + qmsTotalScore;
  const grandTotalMax = vmTotalMax + qmsTotalMax;
  
  // Calculate percentage (defaults to 100% if no points are registered yet)
  const scorePercent = grandTotalMax > 0 ? (grandTotalScore / grandTotalMax) * 100 : 100;
  
  const complianceIndex = scorePercent.toFixed(1) + '%';
  let grade = 'A+';
  let gradeColor = '#10b981'; // emerald
  
  if (scorePercent < 50) {
    grade = 'Fail';
    gradeColor = '#ef4444'; // red
  } else if (scorePercent < 75) {
    grade = 'C (Deficient)';
    gradeColor = '#f59e0b'; // amber
  } else if (scorePercent < 90) {
    grade = 'B (Acceptable)';
    gradeColor = '#3b82f6'; // blue
  } else if (scorePercent < 95) {
    grade = 'A';
    gradeColor = '#10b981';
  }

  const dynamicMetrics = [
    {
      title: 'Overall Compliance Index',
      score: complianceIndex,
      grade: grade,
      gradeColor: gradeColor,
      desc: 'cGMP & 21 CFR Part 11 Audit Trail Integrity',
      trend: grandTotalMax > 0 ? `🎯 ${grandTotalScore}/${grandTotalMax} Combined Points` : 'No points logged yet',
      trendUp: true,
    },
    {
      title: 'SOP Execution Accuracy',
      score: vmTotalMax > 0 ? `${((vmTotalScore / vmTotalMax) * 100).toFixed(1)}%` : '100%',
      grade: vmTotalMax > 0 ? (vmTotalScore === vmTotalMax ? 'Flawless' : 'Compliant') : 'Pending',
      gradeColor: '#10b981',
      desc: 'Technical parameter entries across manufacturing steps',
      trend: `${vmTotalScore}/${vmTotalMax} VM Checkpoints`,
      trendUp: true,
    },
    {
      title: 'QMS Decision Accuracy',
      score: qmsTotalMax > 0 ? `${((qmsTotalScore / qmsTotalMax) * 100).toFixed(1)}%` : '100%',
      grade: qmsTotalMax > 0 ? (qmsTotalScore === qmsTotalMax ? 'Optimal' : 'Verified') : 'Pending',
      gradeColor: '#3b82f6',
      desc: 'SME triage and root cause diagnostic scoring',
      trend: `${qmsTotalScore}/${qmsTotalMax} QMS Points`,
      trendUp: true,
    },
    {
      title: 'Alarm Response Speed',
      score: '1.4 min',
      grade: 'Optimal',
      gradeColor: '#06b6d4',
      desc: 'Mean Time to Acknowledge & Triage Process Alarms',
      trend: 'Within ±2 min limit',
      trendUp: true,
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        padding: '28px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="glass-panel crosshair-corner animate-fade-in"
        style={{
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(16,185,129,0.1)',
            border: '2px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Award aria-hidden="true" style={{ width: 18, height: 18, color: '#10b981' }} />
          </div>
          <div>
            <h1 className="type-heading" style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
              Simulation Performance Scorecard
            </h1>
            <p className="type-body" style={{ fontSize: 12, marginTop: 2, margin: 0, color: 'var(--text-secondary)' }}>
              Comprehensive post-batch evaluation · Batch #{batchState?.batch?.id || '—'} — Paracetamol 500 mg
            </p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="pill-btn pill-btn-secondary"
          style={{ fontSize: 12, padding: '8px 18px' }}
        >
          <Download aria-hidden="true" style={{ width: 13, height: 13 }} />
          Export PDF
        </button>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────── */}
      <div
        className="animate-slide-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          animationDelay: '0.05s',
        }}
      >
        {dynamicMetrics.map((m, idx) => (
          <div
            key={idx}
            className="glass-surface"
            style={{
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--bg-surface)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${m.gradeColor}60, transparent)`,
            }} aria-hidden="true" />

            <span className="type-label" style={{ fontSize: 9.5, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{m.title}</span>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <span className="type-data" style={{ fontSize: 28, color: 'var(--text-primary)', fontWeight: 'bold' }}>
                {m.score}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span
                  className="status-badge"
                  style={{
                    background: `${m.gradeColor}18`,
                    color: m.gradeColor,
                    borderColor: `${m.gradeColor}35`,
                    fontWeight: 700,
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid'
                  }}
                >
                  {m.grade}
                </span>
                <span
                  className="type-caption"
                  style={{ color: '#10b981', fontSize: 9.5, fontWeight: 600 }}
                >
                  {m.trend}
                </span>
              </div>
            </div>

            <p className="type-caption" style={{ lineHeight: 1.5, fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs Selector ────────────────────────────────────────────── */}
      <div className="guide-modal-tabs" style={{ background: 'transparent', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'vm' ? 'active' : ''}`}
          onClick={() => setActiveTab('vm')}
          style={{ flex: 'none', padding: '10px 24px', borderBottomWidth: 3 }}
        >
          <ClipboardList size={14} />
          <span>VM Operator Checkpoints</span>
        </button>
        <button
          type="button"
          className={`guide-tab-btn ${activeTab === 'qms' ? 'active' : ''}`}
          onClick={() => setActiveTab('qms')}
          style={{ flex: 'none', padding: '10px 24px', borderBottomWidth: 3 }}
        >
          <FileText size={14} />
          <span>QMS Decision Rubrics</span>
        </button>
      </div>

      {/* ── Tab Contents ─────────────────────────────────────────────── */}
      <div className="glass-panel animate-slide-up" style={{ padding: '20px 24px', background: 'var(--bg-surface)' }}>
        
        {activeTab === 'vm' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <ShieldCheck aria-hidden="true" style={{ width: 16, height: 16, color: '#10b981' }} />
              <h2 className="type-section" style={{ margin: 0, fontSize: 14 }}>VM Operator Technical Checkpoint Log</h2>
            </div>

            {loadingScores ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading scoring records…</p>
            ) : vmScores.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <AlertTriangle style={{ color: 'var(--text-warning)', marginBottom: 8 }} size={24} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>No VM operator entries have been logged for this batch yet.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Weigh materials and set machine parameters in the VM role panels to see evaluations.</p>
              </div>
            ) : (
              <div className="guide-parameters-table-container">
                <table className="guide-parameters-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Parameter</th>
                      <th>Expected compliance Behavior</th>
                      <th>Operator entry</th>
                      <th>Status</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vmScores.map((score) => (
                      <tr key={score.id}>
                        <td><strong>{score.stage}</strong></td>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{score.field}</span></td>
                        <td>{score.expected}</td>
                        <td style={{ fontWeight: 'bold' }}>{score.actual}</td>
                        <td>
                          {score.passed ? (
                            <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 'bold' }}>
                              <CheckCircle2 size={12} /> PASS
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 'bold' }}>
                              <XCircle size={12} /> FAIL
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                          {score.marks_awarded} / {score.marks_max}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qms' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <ShieldCheck aria-hidden="true" style={{ width: 16, height: 16, color: '#3b82f6' }} />
              <h2 className="type-section" style={{ margin: 0, fontSize: 14 }}>Quality Management System (QMS) Quiz Scorecard</h2>
            </div>

            {Object.keys(qmsScores).length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }}>
                <AlertTriangle style={{ color: 'var(--text-warning)', marginBottom: 8 }} size={24} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>No QMS triage quiz scores have been recorded yet.</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Complete the SME Impact Assessment and Investigation Officer quizzes to see marks.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(qmsScores).map(([key, data]) => {
                  const isSme = !key.includes('investigation');
                  const title = isSme ? `SME Impact Assessment (Event #${key})` : `Investigation Officer Diagnosis (Event #${key.replace('investigation_', '')})`;
                  return (
                    <div
                      key={key}
                      style={{
                        padding: 16,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 16
                      }}
                    >
                      <div>
                        <h4 style={{ margin: '0 0 6px', color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>{title}</h4>
                        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          <strong>Selected Option:</strong> Option {data.selectedOptionValue}
                        </p>
                        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {isSme ? "Evaluated on compliance significance triage and potential product impact safety considerations." : "Evaluated on root cause identification accuracy and proposed corrective actions."}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className="status-badge" style={{
                          background: data.score === data.maxScore ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: data.score === data.maxScore ? '#10b981' : '#f59e0b',
                          fontWeight: 'bold',
                          fontSize: 12,
                          padding: '3px 10px',
                          border: '1px solid',
                          borderRadius: 4
                        }}>
                          {data.score} / {data.maxScore} Pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
