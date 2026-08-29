import React, { useState } from 'react';
import { BookOpen, ShieldAlert, FileText, ClipboardList, CheckCircle, ListTodo } from 'lucide-react';

export default function FormulationGuideModal({ config, isOpen, onClose, onConfirm }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen || !config) return null;

  const refData = config.referenceData || {
    sopSummary: "SOP details are being retrieved for this product...",
    criticalParameters: [],
    regulatoryContext: "Meets standard validation standards.",
    commonDeviations: []
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BookOpen size={16} /> },
    { id: 'instructions', label: 'Batch Instructions', icon: <ListTodo size={16} /> },
    { id: 'parameters', label: 'Critical Parameters', icon: <ClipboardList size={16} /> },
    { id: 'regulatory', label: 'Regulatory & GMP', icon: <FileText size={16} /> },
    { id: 'deviations', label: 'Known Deviations', icon: <ShieldAlert size={16} /> }
  ];

  return (
    <div className="guide-modal-overlay">
      <div className="guide-modal-card animate-fade-in">
        <div className="guide-modal-header">
          <span className="guide-modal-icon">📖</span>
          <div>
            <h2>Formulation SOP & Study Guide</h2>
            <p className="guide-subtitle">{config.name} — Specification Reference</p>
          </div>
        </div>

        <div className="guide-modal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`guide-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="guide-modal-content">
          {activeTab === 'overview' && (
            <div className="guide-tab-content">
              <h3>Standard Operating Procedure (SOP) Summary</h3>
              <p className="guide-paragraph">{refData.sopSummary}</p>
              <div className="guide-card-tip">
                <strong>💡 Quick Tip:</strong> Read this guide carefully before starting. You will be evaluated and scored based on how accurately you set equipment parameters and maintain tolerances.
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="guide-tab-content">
              <h3>Batch Manufacturing Instructions</h3>
              <p className="guide-tab-desc">Follow these target parameter settings exactly during the simulation run. You will be evaluated on these checkpoints:</p>
              <div className="guide-parameters-table-container">
                <table className="guide-parameters-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Expected Parameter / Action</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(config.evaluationRubric?.vmCheckpoints || []).map((checkpoint, index) => (
                      <tr key={index}>
                        <td><strong>{checkpoint.stage}</strong></td>
                        <td>{checkpoint.expectedBehavior}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="status-badge" style={{
                            background: 'rgba(6,182,212,0.1)',
                            color: 'var(--teal)',
                            borderColor: 'rgba(6,182,212,0.25)',
                            fontSize: '10px',
                            padding: '2px 8px'
                          }}>
                            {checkpoint.marks} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'parameters' && (
            <div className="guide-tab-content">
              <h3>Critical Process Parameters (CPPs)</h3>
              <p className="guide-tab-desc">These are the validated ranges that must be strictly maintained at each manufacturing phase:</p>
              <div className="guide-parameters-table-container">
                <table className="guide-parameters-table">
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Critical Parameter</th>
                      <th>Validated Target / Range</th>
                      <th>Clinical / Quality Importance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refData.criticalParameters.map((param, index) => (
                      <tr key={index}>
                        <td><strong>{param.stage}</strong></td>
                        <td>{param.parameter}</td>
                        <td className="param-range">{param.range}</td>
                        <td>{param.importance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'regulatory' && (
            <div className="guide-tab-content">
              <h3>Regulatory Context & Compliance Standards</h3>
              <p className="guide-paragraph">{refData.regulatoryContext}</p>
              <div className="regulatory-badges">
                <span className="regulatory-badge">ICH Q8 Compliant</span>
                <span className="regulatory-badge">21 CFR Part 211</span>
                <span className="regulatory-badge">ALCOA+ Integrity</span>
              </div>
            </div>
          )}

          {activeTab === 'deviations' && (
            <div className="guide-tab-content">
              {config.defect && (
                <div className="active-defect-alert-card" style={{
                  padding: 16,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1.5px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  marginBottom: 20
                }}>
                  <h4 style={{ color: '#ef4444', textTransform: 'uppercase', margin: '0 0 6px', fontSize: 12.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🚨</span> Active Run Defect (Simulation Target)
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#cbd5e1' }}>
                    During this simulation run, a hardware/process deviation is scripted to occur:<br />
                    • <strong>Trigger Stage:</strong> {config.defect.triggerStage}<br />
                    • <strong>Parameter:</strong> {config.defect.parameter} (Normal: {config.defect.normal}{config.defect.unit} → Drift target: {config.defect.drift}{config.defect.unit})<br />
                    • <strong>Expected Alarm Alert:</strong> "{config.defect.message}"
                  </p>
                </div>
              )}

              <h3>Common Deviation Modes</h3>
              <p className="guide-tab-desc">Be alert for the following anomalies during the run. The QMS suite will require you to analyze and triage these issues if they occur:</p>
              <div className="deviations-grid">
                {refData.commonDeviations.map((dev, index) => (
                  <div key={index} className="deviation-item-card">
                    <h4>⚠️ {dev.title}</h4>
                    <p>{dev.cause}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="guide-modal-footer">
          <label className="guide-checkbox-label">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span className="checkbox-text">I have read the SOP guide and understand the target specifications.</span>
          </label>

          <div className="guide-footer-actions">
            <button type="button" className="pill-btn pill-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="pill-btn pill-btn-primary"
              disabled={!acknowledged}
              onClick={onConfirm}
            >
              <CheckCircle size={16} />
              <span>Begin Simulation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
