import React from 'react';
import { ShieldCheck, FileCheck, CheckCircle2, XCircle, Award, Printer, Download } from 'lucide-react';

export default function CertificateOfAnalysis({
  batchId = "904",
  productName = "Paracetamol 500 mg Tablets",
  batchSize = "100,000 Tablets",
  mfgDate = "2026-08-20",
  expDate = "2029-08-19",
  status = "released", // released | hold
  onClose
}) {
  const testResults = [
    { test: "Appearance", spec: "White, capsule-shaped bi-layer tablet with 'JSS 500'", result: "Conforms", status: "pass" },
    { test: "Average Weight", spec: "585.0 mg ± 2.0% (573.3 - 596.7 mg)", result: "584.2 mg", status: "pass" },
    { test: "Uniformity of Dosage Units", spec: "USP <905> Acceptable Value L1 < 15.0", result: "AV = 3.2", status: "pass" },
    { test: "Hardness", spec: "7.0 - 10.0 kp", result: "8.4 kp", status: "pass" },
    { test: "Friability", spec: "Not more than 0.8%", result: "0.22%", status: "pass" },
    { test: "Dissolution (Stage 1)", spec: "NLT 80% (Q) in 30 minutes in pH 5.8 buffer", result: "94.5% dissolved", status: "pass" },
    { test: "Assay (HPLC)", spec: "98.0% - 102.0% of labeled amount", result: "99.8%", status: "pass" },
    { test: "Microbial Limit Test", spec: "Total Aerobic Count < 1000 cfu/g", result: "120 cfu/g", status: "pass" },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(8, 10, 16, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '24px',
      overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: 'rgba(17, 24, 39, 0.98)',
        border: '2px solid var(--neon-accent)',
        borderRadius: 'var(--radius-xl)',
        padding: '30px',
        boxShadow: '0 0 30px var(--neon-glow)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        {/* Certificate Header */}
        <div style={{ borderBottom: '2px solid rgba(6,182,212,0.2)', paddingBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal)', fontFamily: 'var(--font-display)', fontWeight: 'bold', fontSize: '20px', letterSpacing: '0.05em' }}>
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              JSS PHARMACEUTICAL QUALITY ASSURANCE
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-display)', marginTop: '4px' }}>
              CERTIFICATE OF ANALYSIS (CoA)
            </h1>
            <p style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              cGMP & ISO 17025 Certified Quality Control Laboratory
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="hud-tag">
              CoA-{batchId}-2026
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '8px' }}>
              Issue Date: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Product Metadata Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          margin: '24px 0',
          backgroundColor: 'rgba(4, 8, 18, 0.7)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>PRODUCT:</span>
            <strong style={{ color: '#ffffff', fontWeight: 'bold' }}>{productName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>BATCH NUMBER:</span>
            <strong style={{ color: 'var(--teal)', fontWeight: 'bold' }}>BATCH-JSS-{batchId}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>BATCH SIZE:</span>
            <strong style={{ color: '#ffffff', fontWeight: 'bold' }}>{batchSize}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>EXPIRY DATE:</span>
            <strong style={{ color: '#10b981', fontWeight: 'bold' }}>{expDate}</strong>
          </div>
        </div>

        {/* Quality Test Results Table */}
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', fontFamily: 'var(--font-mono)', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--teal)', fontWeight: 'bold' }}>
                <th style={{ padding: '12px' }}>TEST PARAMETER</th>
                <th style={{ padding: '12px' }}>SPECIFICATION (USP)</th>
                <th style={{ padding: '12px' }}>ANALYTICAL RESULT</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody style={{ color: '#cbd5e1' }}>
              {testResults.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{t.test}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{t.spec}</td>
                  <td style={{ padding: '12px', color: 'var(--teal)' }}>{t.result}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}>
                      <CheckCircle2 className="w-3 h-3" /> PASS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Final Quality Stamp & Digital Signatures */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          margin: '24px 0 12px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {status === 'released' ? (
              <div style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                color: '#10b981',
                fontFamily: 'var(--font-display)',
                fontWeight: '800',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
              }}>
                <Award className="w-6 h-6 text-emerald-400" />
                FINAL BATCH DISPOSITION: APPROVED FOR RELEASE
              </div>
            ) : (
              <div style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid #ef4444',
                color: '#ef4444',
                fontFamily: 'var(--font-display)',
                fontWeight: '800',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
              }}>
                <XCircle className="w-6 h-6 text-red-400" />
                FINAL BATCH DISPOSITION: BATCH ON HOLD / QUARANTINE
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>DIGITALLY SIGNED BY QA RELEASE OFFICER</div>
            <div style={{ color: 'var(--teal)' }}>Dr. Aris Thorne, Head of Quality Assurance</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>21 CFR Part 11 Compliant PKI Timestamp</div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <button onClick={onClose} className="pill-btn pill-btn-secondary">
            CLOSE PREVIEW
          </button>
          <button onClick={() => window.print()} className="pill-btn">
            <Printer className="w-4 h-4" /> PRINT CERTIFICATE
          </button>
        </div>
      </div>
    </div>
  );
}
