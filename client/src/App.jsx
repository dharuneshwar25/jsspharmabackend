import { useEffect, useMemo, useState } from 'react';
import { useSimStore } from './store';
import VMPanel from './components/VMPanel';
import QMSPanel from './components/QMSPanel';
import LandingView from './components/LandingView';
import ScenarioSetupView from './components/ScenarioSetupView';
import InvestigationSuiteView from './components/InvestigationSuiteView';
import EvaluationScorecardView from './components/EvaluationScorecardView';
import GamificationView from './components/GamificationView';
import SOPGuideView from './components/SOPGuideView';
import CertificateOfAnalysis from './components/CertificateOfAnalysis';
import TelemetryGauge from './components/TelemetryGauge';

import {
  Globe,
  Settings,
  Activity,
  Network,
  Award,
  Trophy,
  BookOpen,
  Volume2,
  VolumeX,
  Columns2,
  Maximize2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Microscope,
  Sun,
  Moon,
} from 'lucide-react';
import './App.css';

// Manufacturing pipeline stage definitions
const PIPELINE_STAGES = [
  { key: 'dispensing',   label: 'Dispense', icon: '⚖️', order: 1 },
  { key: 'milling',      label: 'Milling',  icon: '⚙️', order: 2 },
  { key: 'granulation',  label: 'Granule',  icon: '💧', order: 3 },
  { key: 'drying',       label: 'Drying',   icon: '🌬️', order: 4 },
  { key: 'blending',     label: 'Blend',    icon: '🔄', order: 5 },
  { key: 'compression',  label: 'Compress', icon: '🔨', order: 6 },
  { key: 'coating',      label: 'Coating',  icon: '💨', order: 7 },
  { key: 'inspection',   label: 'Inspect',  icon: '🔍', order: 8 },
  { key: 'packaging',    label: 'Package',  icon: '📦', order: 9 },
];

const THEMES = [
  { id: 'pharma-factory',  label: 'Pharma Factory',  icon: '🏭' },
  { id: 'virtual-factory', label: 'Virtual Factory', icon: '🧬' },
  { id: 'smart-factory',   label: 'Smart Factory',   icon: '📡' },
  { id: 'digital-factory', label: 'Digital Factory', icon: '💠' },
  { id: 'modern-lab',      label: 'Modern Lab',       icon: '🧪' },
  { id: 'futuristic-lab',  label: 'Futuristic Lab',  icon: '⚗️' },
  { id: 'genomics',        label: 'Genomics UI',      icon: '🧫' },
];

const THEME_STORAGE_KEY = 'biofusion-theme';

// ── Navigation config ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { view: 'landing',         label: 'Welcome',       Icon: Globe     },
  { view: 'setup',           label: 'Setup',         Icon: Settings  },
  { view: 'command_center',  label: 'Command',       Icon: Activity  },
  { view: 'investigation',   label: 'QMS Suite',     Icon: Network   },
  { view: 'scorecard',       label: 'Scorecard',     Icon: Award     },
  { view: 'gamification',    label: 'Achievements',  Icon: Trophy    },
  { view: 'sop',             label: 'SOP Guide',     Icon: BookOpen  },
];

// ── Focus mode config ──────────────────────────────────────────────────
const FOCUS_MODES = [
  { id: 'split',    label: '50/50',     Icon: Columns2 },
  { id: 'focus_vm', label: 'Focus VM',  Icon: Cpu      },
  { id: 'focus_qms',label: 'Focus QMS', Icon: Microscope },
  { id: 'full_vm',  label: 'Full VM',   Icon: Maximize2 },
  { id: 'full_qms', label: 'Full QMS',  Icon: Maximize2 },
];

export default function App() {
  const {
    batchState,
    batchRoles,
    qmsBatchRoles,
    activePanel,
    loading,
    init,
    setActivePanel,
    activeEvent,
    alarmActive,
    selectedRoleKey,
    closeRole,
    selectedQmsRoleKey,
    closeQmsRole,
    skipAll,
  } = useSimStore();

  const [currentView, setCurrentView] = useState('landing');
  const [focusMode, setFocusMode]     = useState('split');
  const [soundMuted, setSoundMuted]   = useState(false);
  const [showCoA, setShowCoA]         = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) || 'pharma-factory'
  );

  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem('pharma-theme-mode') || 'light'
  );

  useEffect(() => { init(); }, [init]);
  useEffect(() => { localStorage.setItem(THEME_STORAGE_KEY, theme); }, [theme]);

  const [skippingAll, setSkippingAll] = useState(false);

  useEffect(() => {
    const handleViewChange = (e) => {
      if (e.detail) {
        setCurrentView(e.detail);
      }
    };
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('pharma-theme-mode', themeMode);
    document.documentElement.setAttribute('data-theme-mode', themeMode);
  }, [themeMode]);

  // Handle global Esc key to close overlay modals or return from role views
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showCoA) {
          setShowCoA(false);
        } else if (currentView === 'sop') {
          setCurrentView('command_center');
        } else if (currentView === 'command_center') {
          if (selectedRoleKey) {
            closeRole();
          } else if (selectedQmsRoleKey) {
            closeQmsRole();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, showCoA, selectedRoleKey, selectedQmsRoleKey, closeRole, closeQmsRole]);

  const machineStatus = batchState?.machine?.status ?? 'idle';
  const batchStatus   = batchState?.batch?.status   ?? 'no batch';
  const activeTheme   = useMemo(() => THEMES.find(t => t.id === theme) || THEMES[0], [theme]);

  const handleStartSetup        = () => setCurrentView('setup');
  const handleLaunchCommandCenter = () => setCurrentView('command_center');

  // Column span mapping for each focus mode
  const vmCols  = { split: 'lg:col-span-6', focus_vm: 'lg:col-span-8', focus_qms: 'lg:col-span-4', full_vm: 'lg:col-span-12' };
  const qmsCols = { split: 'lg:col-span-6', focus_qms: 'lg:col-span-8', focus_vm: 'lg:col-span-4', full_qms: 'lg:col-span-12' };

  return (
    <div className="app-shell flex flex-col min-h-screen" data-theme={theme}>

      {/* ── Ambient background ────────────────────────────────────────── */}
      <div className="ambient-layer" aria-hidden="true">
        <div className="ambient-particles">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`particle p-${i}`} />
          ))}
        </div>
        <div className="ambient-scanline" />
      </div>

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="topbar" role="banner">

        {/* Brand */}
        <div
          className="topbar-brand"
          onClick={() => setCurrentView('landing')}
          role="button"
          tabIndex={0}
          aria-label="JSS Pharma Simulator — go to home"
          onKeyDown={e => e.key === 'Enter' && setCurrentView('landing')}
        >
          <div className="topbar-logo" aria-hidden="true">JSS</div>
          <div className="topbar-brand-copy">
            <span className="topbar-brand-name">JSS PHARMA SIMULATOR</span>
            <span className="topbar-brand-sub">{activeTheme.icon} {activeTheme.label}</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="topbar-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map(({ view, label, Icon }) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`topbar-nav-btn${currentView === view ? ' active' : ''}`}
              aria-current={currentView === view ? 'page' : undefined}
            >
              <Icon aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0 }} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Utility Controls */}
        <div className="topbar-utils" role="group" aria-label="Status and controls">
          {batchState && !batchState.stages?.every(s => s.status === 'completed') && (
            <button
              onClick={async () => {
                setSkippingAll(true);
                try {
                  await skipAll();
                } catch (err) {
                  alert("Skip all failed: " + err.message);
                } finally {
                  setSkippingAll(false);
                }
              }}
              className="status-badge status-badge--warning"
              style={{
                cursor: 'pointer',
                gap: 5,
                padding: '5px 12px',
                background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
                borderColor: '#ea580c',
                color: '#ffffff',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.4)'
              }}
              disabled={skippingAll}
              aria-label="Skip remaining stages and QMS alarms"
            >
              ⚡ {skippingAll ? 'Skipping...' : 'Demo Skip All'}
            </button>
          )}

          {batchState && (
            <button
              onClick={() => setShowCoA(true)}
              className="status-badge status-badge--success"
              style={{ cursor: 'pointer', gap: 5, padding: '5px 12px' }}
              aria-label="Preview Certificate of Analysis"
            >
              <FileText aria-hidden="true" style={{ width: 11, height: 11 }} />
              CoA Preview
            </button>
          )}

          <button
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="topbar-icon-btn"
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {themeMode === 'light'
              ? <Moon aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
              : <Sun aria-hidden="true" style={{ width: 15, height: 15, color: '#fbbf24' }} />
            }
          </button>

          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="topbar-icon-btn"
            title={soundMuted ? 'Enable audio alarms' : 'Mute audio alarms'}
            aria-label={soundMuted ? 'Enable audio alarms' : 'Mute audio alarms'}
          >
            {soundMuted
              ? <VolumeX aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--danger-light)' }} />
              : <Volume2 aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--teal)' }} />
            }
          </button>

          <StatusPill label="Machine" value={machineStatus} />
          <StatusPill label="Batch"   value={batchStatus} />
        </div>
      </header>

      {/* ── Facility Pipeline Strip (Command Center only) ─────────────── */}
      {currentView === 'command_center' && (
        <FacilityPipeline
          batchState={batchState}
          batchRoles={batchRoles}
          qmsBatchRoles={qmsBatchRoles}
          activePanel={activePanel}
          alarmActive={alarmActive}
        />
      )}

      {/* ── Main View Router ──────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col" style={{ zIndex: 1 }}>
        {currentView === 'landing'      && <LandingView onStartSetup={handleStartSetup} />}
        {currentView === 'setup'        && <ScenarioSetupView onLaunchCommandCenter={handleLaunchCommandCenter} />}
        {currentView === 'investigation' && <InvestigationSuiteView />}
        {currentView === 'scorecard'    && <EvaluationScorecardView />}
        {currentView === 'gamification' && <GamificationView />}
        {currentView === 'sop'          && <SOPGuideView />}

        {currentView === 'command_center' && (
          <div className="flex-1 flex flex-col" style={{ padding: '8px 12px 12px', gap: 8 }}>

            {/* Focus Mode Toolbar */}
            <div className="focus-toolbar" role="toolbar" aria-label="Panel focus controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="focus-toolbar-label">Workspace Mode</span>
                <div className="focus-btn-group">
                  {FOCUS_MODES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setFocusMode(id)}
                      className={`focus-btn${focusMode === id ? ' active' : ''}`}
                      aria-pressed={focusMode === id}
                      aria-label={`${label} workspace mode`}
                    >
                      <Icon aria-hidden="true" style={{ width: 12, height: 12 }} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Telemetry gauges strip */}
              <div className="telemetry-strip" aria-label="Live process telemetry">
                <TelemetryGauge
                  label="Granulator Temp"
                  value={batchState?.activeEvent ? 66.8 : 55.0}
                  min={30} max={80} unit="°C"
                  status={batchState?.activeEvent ? 'alarm' : 'normal'}
                />
                <TelemetryGauge label="Impeller Speed" value={450} min={300} max={600} unit="RPM" status="normal" />
                <TelemetryGauge label="Compress Force"  value={18.2} min={10}  max={25}  unit="kN"  status="normal" />
              </div>
            </div>

            {/* Split View Panels */}
            <div
              className="command-center-workspace-grid"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minHeight: 640,
                flex: 1,
                '--grid-template': focusMode === 'full_vm'
                  ? '1fr'
                  : focusMode === 'full_qms'
                  ? '1fr'
                  : focusMode === 'focus_vm'
                  ? '8fr 4fr'
                  : focusMode === 'focus_qms'
                  ? '4fr 8fr'
                  : '1fr 1fr',
              }}
            >
              {/* VM Panel */}
              {focusMode !== 'full_qms' && (
                <section
                  className={`glass-panel crosshair-corner overflow-y-auto transition-all ${vmCols[focusMode] || 'lg:col-span-6'}`}
                  style={{ padding: '20px 18px 18px' }}
                  aria-label="Virtual Manufacturing panel"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative', zIndex: 10 }}>
                    <span className="cyber-sticker cyber-sticker--green">[ CONSOLE: FACTORY OPERATOR ]</span>
                    <span className="type-caption" style={{ color: 'var(--neon-accent)', fontSize: 9 }}>LIVE CPV DATA</span>
                  </div>
                  <VMPanel />
                </section>
              )}

              {/* QMS Panel */}
              {focusMode !== 'full_vm' && (
                <section
                  className={`glass-panel crosshair-corner overflow-y-auto transition-all ${qmsCols[focusMode] || 'lg:col-span-6'}`}
                  style={{ padding: '20px 18px 18px' }}
                  aria-label="Quality Management System panel"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative', zIndex: 10 }}>
                    <span className="cyber-sticker cyber-sticker--pink">[ OVERWATCH: QMS LEADS ]</span>
                    <span className="type-caption" style={{ color: 'var(--neon-accent)', fontSize: 9 }}>COMPLIANCE SIGN-OFF</span>
                  </div>
                  <QMSPanel />
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Certificate of Analysis Modal ─────────────────────────────── */}
      {showCoA && (
        <CertificateOfAnalysis
          batchId={batchState?.batch?.id || '904'}
          status={batchState?.batch?.status === 'released' ? 'released' : 'hold'}
          onClose={() => setShowCoA(false)}
        />
      )}
    </div>
  );
}

// ── StatusPill ─────────────────────────────────────────────────────────
function StatusPill({ label, value }) {
  const statusClass =
    value === 'on_hold' || value === 'alarm' || value === 'critical'
      ? 'alarm'
      : value === 'released' || value === 'running'
      ? 'running'
      : 'idle';

  return (
    <div
      className={`status-pill ${statusClass}`}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <span className="status-pill-label">{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ── FacilityPipeline ────────────────────────────────────────────────────
function FacilityPipeline({ batchState, batchRoles, qmsBatchRoles, activePanel, alarmActive }) {
  if (!batchState) return null;

  const roles      = activePanel === 'vm' ? batchRoles : qmsBatchRoles;
  const stages     = batchState?.stages || [];
  const completed  = stages.filter(s => s.status === 'completed').length;
  const activeIdx  = stages.findIndex(s => s.status === 'active');
  const pct        = Math.round((completed / Math.max(stages.length, 1)) * 100);

  return (
    <div className="facility-strip" role="region" aria-label="Live manufacturing pipeline">
      <div className="facility-strip-header">
        <div className="facility-strip-title">
          <span aria-hidden="true">🏭</span>
          Live Manufacturing Pipeline
        </div>
        <div className="facility-strip-meta">
          {completed} of {stages.length > 0 ? stages.length : 9} stages complete · {pct}%
        </div>
      </div>

      {/* 9-Stage pipeline with connectors */}
      <div className="pipeline-track" role="list" aria-label="Manufacturing stages">
        {PIPELINE_STAGES.map((def, idx) => {
          const stage = stages.find(s =>
            s.name?.toLowerCase().includes(def.key) ||
            s.stage_order === def.order
          );
          const status = stage?.status || 'pending';
          const isLast = idx === PIPELINE_STAGES.length - 1;

          return (
            <div key={def.key} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
              <div
                className={`pipeline-stage ${status}`}
                role="listitem"
                aria-label={`${def.label}: ${status}`}
              >
                <div className="pipeline-stage-dot" title={`${def.label} — ${status}`}>
                  {status === 'completed'
                    ? <span style={{ fontSize: 10 }}>✓</span>
                    : def.icon
                  }
                </div>
                <span className="pipeline-stage-name">{def.label}</span>
              </div>
              {!isLast && (
                <div
                  className={`pipeline-connector ${status === 'completed' ? 'passed' : ''}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overall progress bar */}
      <div className="facility-progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Batch progress">
        <div className="facility-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
