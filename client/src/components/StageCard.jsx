export default function StageCard({ stage, config, isCurrent, onStart, onComplete }) {
  const stageConfig = config?.stages.find((s) => s.name === stage.name);
  const param = stageConfig?.params?.[0];

  return (
    <div className={`stage-card status-${stage.status}`}>
      <div className="stage-rail-node">
        <span className="stage-index">{String(stage.stage_order).padStart(2, '0')}</span>
      </div>

      <div className="stage-body">
        <div className="stage-header">
          <h3>{stage.name}</h3>
          <span className={`stage-tag tag-${stage.status}`}>{stage.status}</span>
        </div>

        {param && (
          <div className="stage-readout">
            <span className="readout-label">{param.label}</span>
            <span className="readout-value">
              {param.normal} {param.unit}
            </span>
          </div>
        )}

        {isCurrent && stage.status !== 'completed' && (
          <div className="stage-actions">
            {stage.status === 'pending' && (
              <button className="action-btn start" onClick={() => onStart(stage.id)}>
                Start Stage
              </button>
            )}
            {stage.status === 'active' && (
              <button className="action-btn complete" onClick={() => onComplete(stage.id)}>
                Complete Stage
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
