import { useState } from 'react';
import { useSimStore } from '../../store';

const ICONS = {
  monitor: '📡',
  sme: '🔬',
  investigation: '🕵️',
  capa: '🛠️',
  qa: '✅',
};

export default function QMSPanelHeader({ icon, title, onBack }) {
  const { skipQmsAll, activeEvent } = useSimStore();
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await skipQmsAll();
    } catch (err) {
      alert("Skip failed: " + err.message);
    } finally {
      setSkipping(false);
    }
  };

  const showSkip = !!activeEvent;

  return (
    <div className="operator-panel-header" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <button type="button" className="operator-back-btn" onClick={onBack}>
        ← All QMS Roles
      </button>
      <span className="operator-panel-icon">{ICONS[icon] || '🛠️'}</span>
      <h2>{title}</h2>
      {showSkip && (
        <button
          type="button"
          className="qms-primary-button"
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
            borderColor: '#ea580c',
            boxShadow: '0 4px 10px rgba(217, 119, 6, 0.35)',
            fontSize: '11px',
            padding: '6px 14px',
            borderRadius: '12px'
          }}
          disabled={skipping}
          onClick={handleSkip}
        >
          ⚡ {skipping ? 'SKIPPING...' : 'DEMO SKIP QMS'}
        </button>
      )}
    </div>
  );
}
