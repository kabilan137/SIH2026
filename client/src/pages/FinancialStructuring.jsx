import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Calculator, CheckCircle2, ChevronDown, ChevronUp,
  Landmark, Clock, Sparkles, ShieldCheck, TrendingUp, AlertTriangle, Target,
  MapPin, Layers, Percent, BarChart2, Briefcase, FileText, Users, Home,
  DollarSign, PieChart as PieIcon, Zap, Map
} from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { matchSchemes, submitFinancialStructuring } from '../api/analysisApi.js';
import PageLoader from '../components/PageLoader.jsx';
import LiquidGlass from '../components/LiquidGlass.jsx';
import { renderMd } from '../utils/renderMd.jsx';

function formatINR(val) {
  if (!Number.isFinite(Number(val))) return '₹0';
  return '₹' + Math.round(Number(val)).toLocaleString('en-IN');
}

const STEPS = [
  { id: 1, label: 'Scheme Matching', icon: Target },
  { id: 2, label: 'Select Scheme',   icon: Landmark },
  { id: 3, label: 'Shop Expenses',   icon: Calculator },
  { id: 4, label: 'AI Report',       icon: Sparkles }
];

function StepIndicator({ currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done  = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--green)' : active ? 'var(--blue)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${done ? 'var(--green)' : active ? 'var(--blue)' : 'rgba(255,255,255,0.15)'}`,
                transition: 'all 0.3s ease'
              }}>
                {done ? <CheckCircle2 size={20} style={{ color: '#fff' }} /> : <Icon size={18} style={{ color: active ? '#fff' : 'var(--text-muted)' }} />}
              </div>
              <span style={{ fontSize: '0.72rem', marginTop: '0.35rem', color: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--text-muted)', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--green)' : 'rgba(255,255,255,0.08)', margin: '0 6px', marginBottom: 18, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SchemeCard({ matched, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const s = matched.scheme || {};
  const isSelected = selected?.schemeId === String(matched.schemeId);

  return (
    <div
      style={{
        border: `2px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14,
        padding: '1.25rem',
        background: isSelected ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.03)',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onClick={() => onSelect(matched)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--blue)' }} />}
            <h3 style={{ margin: 0, fontSize: '1rem', color: isSelected ? 'var(--blue)' : 'var(--text-main)', lineHeight: 1.4 }}>
              {matched.schemeName}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{matched.ministry}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
            background: matched.matchScore >= 80 ? 'rgba(46,125,50,0.2)' : 'rgba(245,158,11,0.2)',
            color: matched.matchScore >= 80 ? 'var(--green)' : 'var(--amber)'
          }}>
            {matched.matchScore}% Match
          </span>
          <span style={{
            padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.78rem',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)'
          }}>
            {matched.eligibilityStatus}
          </span>
        </div>
      </div>

      {/* Key numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        {[
          { label: 'Loan Cap', value: formatINR(matched.cappedLoanAmount), color: 'var(--blue)' },
          { label: 'Interest', value: `${matched.interestRate}% p.a.`, color: 'var(--green)' },
          { label: 'Tenure', value: `${matched.tenureYears}Y`, color: 'var(--amber)' },
          { label: 'Monthly EMI', value: formatINR(matched.monthlyEMI), color: 'var(--purple)' },
          { label: 'Moratorium', value: `${matched.moratoriumMonths}M`, color: 'var(--teal)' },
          { label: 'Subsidy', value: s.subsidy?.available ? `${s.subsidy.percentage}%` : 'None', color: s.subsidy?.available ? 'var(--green)' : 'var(--text-muted)' }
        ].map(item => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{item.label}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Expand/collapse details */}
      <button
        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide details' : 'Show full details'}
      </button>

      {expanded && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Objective</p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{s.objective}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Eligibility Criteria</p>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.83rem', lineHeight: 1.7 }}>
              {(s.eligibility || []).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Required Documents</p>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.83rem', lineHeight: 1.7 }}>
              {(s.requiredDocuments || []).map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Benefits</p>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.83rem', lineHeight: 1.7 }}>
              {(s.benefits || []).map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
          {matched.reasons?.length > 0 && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--blue)', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Why this scheme matched</p>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.83rem', lineHeight: 1.7 }}>
                {matched.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {s.applicationUrl && (
            <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: '0.83rem' }}>
              Apply Online → {s.applicationUrl}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function FinancialStructuring() {
  const { analysisId } = useParams();
  const { loadAnalysis, state: analysisState } = useAnalysis();
  const analysisDocument = analysisState.currentAnalysis;

  const [step, setStep] = useState(1);

  // ── Step 1 State ───────────────────────────────────────────────────────────
  const [location, setLocation]               = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [totalProjectCost, setTotalProjectCost] = useState('');
  const [requestedLoanAmount, setRequestedLoanAmount] = useState('');
  const [ownContribution, setOwnContribution] = useState('');
  const [isRural, setIsRural]                 = useState(false);
  const [applicantCategory, setApplicantCategory] = useState('General');
  const [assetStatus, setAssetStatus]         = useState('Rented Shop');

  // ── Step 2 State ───────────────────────────────────────────────────────────
  const [matchedSchemes, setMatchedSchemes]   = useState([]);
  const [selectedScheme, setSelectedScheme]   = useState(null);
  const [noSchemeReason, setNoSchemeReason]   = useState('');

  // ── Step 3 State ───────────────────────────────────────────────────────────
  const [shopRent, setShopRent]               = useState('');
  const [productMaintenance, setProductMaintenance] = useState('');
  const [numLabours, setNumLabours]           = useState('');
  const [labourWage, setLabourWage]           = useState('');
  const [otherExpenses, setOtherExpenses]     = useState('');
  const [monthlyRevenue, setMonthlyRevenue]   = useState('');

  // ── Result / loading ───────────────────────────────────────────────────────
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [financialPlan, setFinancialPlan]     = useState(null);

  useEffect(() => {
    if (analysisId) loadAnalysis(analysisId).catch(() => undefined);
  }, [analysisId, loadAnalysis]);

  useEffect(() => {
    if (analysisDocument) {
      if (analysisDocument.input?.location)     setLocation(analysisDocument.input.location);
      if (analysisDocument.input?.businessType) setBusinessCategory(analysisDocument.input.businessType);
    }
  }, [analysisDocument]);

  // Compute totals for display
  const totalLabour = (Number(numLabours) || 0) * (Number(labourWage) || 0);
  const totalExpenses = (Number(shopRent) || 0) + (Number(productMaintenance) || 0) + totalLabour + (Number(otherExpenses) || 0);

  // ── Step 1: Run scheme matching ────────────────────────────────────────────
  const handleMatchSchemes = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await matchSchemes({
        totalProjectCost: Number(totalProjectCost),
        requestedLoanAmount: Number(requestedLoanAmount),
        ownContribution: Number(ownContribution),
        businessCategory,
        location,
        isRural,
        applicantCategory
      });
      setMatchedSchemes(result.matchedSchemes || []);
      setNoSchemeReason(result.noSchemeReason || '');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Scheme matching failed.');
    } finally {
      setLoading(false);
    }
  }, [totalProjectCost, requestedLoanAmount, ownContribution, businessCategory, location, isRural, applicantCategory]);

  // ── Step 3: Generate financial plan ───────────────────────────────────────
  const handleGeneratePlan = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedScheme) { setError('Please select a scheme first.'); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        analysisId,
        location,
        businessCategory,
        totalProjectCost: Number(totalProjectCost),
        requestedLoanAmount: Number(requestedLoanAmount),
        ownContribution: Number(ownContribution),
        ownInvestment: Number(ownContribution),
        selectedSchemeId: String(selectedScheme.schemeId),
        shopRent: Number(shopRent) || 0,
        productMaintenanceCost: Number(productMaintenance) || 0,
        numberOfLabours: Number(numLabours) || 0,
        labourWagePerPerson: Number(labourWage) || 0,
        otherExpenses: Number(otherExpenses) || 0,
        estimatedMonthlyRevenue: Number(monthlyRevenue) || 0,
        isExistingBusiness: false,
        estimatedMonthlyExpenses: totalExpenses,
        assetStatus
      };
      const res = await submitFinancialStructuring(payload);
      if (res) { setFinancialPlan(res); setStep(4); }
      else throw new Error('Failed to generate financial plan.');
    } catch (err) {
      setError(err.message || 'Error generating financial plan.');
    } finally {
      setLoading(false);
    }
  }, [selectedScheme, analysisId, location, businessCategory, totalProjectCost, requestedLoanAmount, ownContribution, shopRent, productMaintenance, numLabours, labourWage, otherExpenses, monthlyRevenue, totalExpenses, assetStatus]);

  if (analysisState.loading && !analysisDocument) {
    return <PageLoader label="Loading market context" />;
  }

  const ai = financialPlan?.aiExplanation;
  const fs = financialPlan?.financialStructure;
  const feasibilityScore = financialPlan?.feasibilityScore ?? 75;
  const feasibilityBreakdown = financialPlan?.feasibilityBreakdown;
  const selectedSchemeFinal = financialPlan?.schemeMatch?.selectedScheme;

  return (
    <div className="financial-page animate-in">
      {/* Top bar */}
      <div className="page-actions result-page-actions">
        <LiquidGlass tagName={Link} to={`/analysis/${analysisId}`} className="secondary-button liquid-glass" depth={15} blur={8} tint={0.06} tintColor="#ffffff" glint={20}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Market Analysis
        </LiquidGlass>
      </div>

      {/* Hero */}
      <section className="result-header-hero" aria-label="Financial Structuring Hero">
        <div className="result-header-meta">
          <span className="result-business-badge">
            <Building2 size={13} aria-hidden="true" />
            Module 2 — Financial Structuring
          </span>
        </div>
        <h1 className="result-location-title" style={{ fontSize: '2.2rem' }}>
          Government Scheme &amp; Financial Advisory
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '750px', marginTop: '0.5rem' }}>
          Match eligible government schemes, select the best fit, enter your shop expenses, and get a complete AI-powered business roadmap.
        </p>
      </section>

      {/* Step Indicator */}
      <div style={{ marginTop: '2rem' }}>
        <StepIndicator currentStep={step} />
      </div>

      {/* ────────── STEP 1: SCHEME MATCHING INPUTS ────────── */}
      {step === 1 && (
        <section className="panel form-panel" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow" style={{ color: 'var(--amber)' }}>Step 1 of 3</p>
              <h2>Scheme Matching Inputs</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Enter your project financial details. We'll find the best government schemes for you.
              </p>
            </div>
            <Target size={22} style={{ color: 'var(--amber)' }} />
          </div>

          <form onSubmit={handleMatchSchemes} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="location">
                Business Location <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>(Auto-filled from Module 1)</span>
              </label>
              <input id="location" type="text" className="form-input" value={location} onChange={e => setLocation(e.target.value)} required placeholder="e.g. Madurai, Tamil Nadu" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="businessCategory">
                Business Category <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>(Auto-filled from Module 1)</span>
              </label>
              <input id="businessCategory" type="text" className="form-input" value={businessCategory} onChange={e => setBusinessCategory(e.target.value)} required placeholder="e.g. Retail Grocery, Tea Stall" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="totalProjectCost">Total Project Cost (₹) *</label>
              <input id="totalProjectCost" type="number" min="1000" step="1000" className="form-input" value={totalProjectCost} onChange={e => setTotalProjectCost(e.target.value)} required placeholder="e.g. 100000" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Total cost to set up the shop including equipment & assets</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="requestedLoanAmount">Expected Loan Amount (₹) *</label>
              <input id="requestedLoanAmount" type="number" min="1000" step="1000" className="form-input" value={requestedLoanAmount} onChange={e => setRequestedLoanAmount(e.target.value)} required placeholder="e.g. 90000" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>How much loan you need from the scheme</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ownContribution">Own Contribution / Margin Money (₹) *</label>
              <input id="ownContribution" type="number" min="0" step="1000" className="form-input" value={ownContribution} onChange={e => setOwnContribution(e.target.value)} required placeholder="e.g. 10000" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Money you are investing from your own pocket</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="assetStatus">Business Assets Available</label>
              <select id="assetStatus" className="form-input" value={assetStatus} onChange={e => setAssetStatus(e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                <option value="None">None</option>
                <option value="Own Shop">Own Shop</option>
                <option value="Own Land">Own Land</option>
                <option value="Rented Shop">Rented Shop</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Location Type *</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                {[{ label: 'Rural', val: true }, { label: 'Urban / Semi-Urban', val: false }].map(opt => (
                  <label key={String(opt.val)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="radio" name="locType" checked={isRural === opt.val} onChange={() => setIsRural(opt.val)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="applicantCategory">Applicant Category</label>
              <select id="applicantCategory" className="form-input" value={applicantCategory} onChange={e => setApplicantCategory(e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                {['General', 'SC', 'ST', 'OBC', 'Women'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
              <button type="submit" className="cta-ai-button" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 600 }}>
                {loading ? 'Finding Matching Schemes...' : 'Find Eligible Schemes →'}
              </button>
            </div>
          </form>

          {error && <div className="error-banner" style={{ marginTop: '1rem' }}>{error}</div>}
        </section>
      )}

      {/* ────────── STEP 2: SCHEME SELECTION ────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section className="panel" style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow" style={{ color: 'var(--blue)' }}>Step 2 of 3</p>
                <h2>Select a Government Scheme</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {matchedSchemes.length > 0
                    ? `Found ${matchedSchemes.length} eligible scheme${matchedSchemes.length > 1 ? 's' : ''} for your project. Click a scheme to select it, then click Continue.`
                    : 'No schemes matched your inputs.'}
                </p>
              </div>
              <Landmark size={22} style={{ color: 'var(--blue)' }} />
            </div>
          </section>

          {noSchemeReason && (
            <div className="error-banner" style={{ margin: 0 }}>
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              {noSchemeReason}
            </div>
          )}

          {matchedSchemes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matchedSchemes.map((m, idx) => (
                <SchemeCard
                  key={idx}
                  matched={m}
                  selected={selectedScheme}
                  onSelect={setSelectedScheme}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button onClick={() => setStep(1)} className="secondary-button" style={{ flex: 1 }}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => { if (selectedScheme) { setStep(3); setError(null); } else setError('Please select a scheme to continue.'); }}
              className="cta-ai-button"
              style={{ flex: 2, justifyContent: 'center' }}
              disabled={!selectedScheme && matchedSchemes.length > 0}
            >
              Continue with Selected Scheme <ArrowRight size={16} />
            </button>
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>
      )}

      {/* ────────── STEP 3: SHOP EXPENSE INPUTS ────────── */}
      {step === 3 && (
        <section className="panel form-panel" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Selected scheme summary */}
          {selectedScheme && (
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 10, padding: '0.9rem 1.1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Selected Scheme</p>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--blue)' }}>{selectedScheme.schemeName}</p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMI</span><p style={{ margin: 0, fontWeight: 700, color: 'var(--purple)' }}>{formatINR(selectedScheme.monthlyEMI)}/mo</p></div>
                <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interest</span><p style={{ margin: 0, fontWeight: 700, color: 'var(--green)' }}>{selectedScheme.interestRate}%</p></div>
                <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loan</span><p style={{ margin: 0, fontWeight: 700 }}>{formatINR(selectedScheme.cappedLoanAmount)}</p></div>
              </div>
            </div>
          )}

          <div className="panel-heading compact">
            <div>
              <p className="eyebrow" style={{ color: 'var(--amber)' }}>Step 3 of 3</p>
              <h2>Monthly Shop Expenses</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Enter your expected monthly operating costs. These help the AI generate an accurate business roadmap.
              </p>
            </div>
            <Calculator size={22} style={{ color: 'var(--amber)' }} />
          </div>

          <form onSubmit={handleGeneratePlan} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="shopRent">
                <Home size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Shop Rent (₹/month)
              </label>
              <input id="shopRent" type="number" min="0" step="500" className="form-input" value={shopRent} onChange={e => setShopRent(e.target.value)} placeholder="e.g. 5000" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="productMaintenance">
                <Layers size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Product / Inventory Cost (₹/month)
              </label>
              <input id="productMaintenance" type="number" min="0" step="500" className="form-input" value={productMaintenance} onChange={e => setProductMaintenance(e.target.value)} placeholder="e.g. 15000" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="numLabours">
                <Users size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Number of Labours / Staff
              </label>
              <input id="numLabours" type="number" min="0" step="1" className="form-input" value={numLabours} onChange={e => setNumLabours(e.target.value)} placeholder="e.g. 2" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="labourWage">
                <DollarSign size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Wage per Labour (₹/month)
              </label>
              <input id="labourWage" type="number" min="0" step="500" className="form-input" value={labourWage} onChange={e => setLabourWage(e.target.value)} placeholder="e.g. 8000" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="otherExpenses">
                <Briefcase size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Other Expenses (₹/month)
              </label>
              <input id="otherExpenses" type="number" min="0" step="500" className="form-input" value={otherExpenses} onChange={e => setOtherExpenses(e.target.value)} placeholder="e.g. 2000 (electricity, misc)" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="monthlyRevenue">
                <TrendingUp size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                Expected Monthly Revenue (₹)
              </label>
              <input id="monthlyRevenue" type="number" min="0" step="1000" className="form-input" value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)} placeholder="e.g. 40000" />
            </div>

            {/* Expense summary */}
            <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1rem 1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Monthly Expense Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Rent', value: formatINR(shopRent || 0) },
                  { label: 'Inventory', value: formatINR(productMaintenance || 0) },
                  { label: 'Labour', value: formatINR(totalLabour) },
                  { label: 'Other', value: formatINR(otherExpenses || 0) }
                ].map(item => (
                  <div key={item.label}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.label}</span>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{item.value}</p>
                  </div>
                ))}
                <div style={{ borderLeft: '2px solid var(--amber)', paddingLeft: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--amber)' }}>Total Monthly</span>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--amber)' }}>{formatINR(totalExpenses)}</p>
                </div>
                {selectedScheme?.monthlyEMI && (
                  <div style={{ borderLeft: '2px solid var(--purple)', paddingLeft: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--purple)' }}>+ EMI</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--purple)' }}>{formatINR(selectedScheme.monthlyEMI)}</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setStep(2)} className="secondary-button" style={{ flex: 1 }}>
                <ArrowLeft size={16} /> Back
              </button>
              <button type="submit" className="cta-ai-button" disabled={loading} style={{ flex: 2, justifyContent: 'center', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 600 }}>
                {loading ? 'Generating AI Report...' : <><Sparkles size={16} /> Generate AI Report</>}
              </button>
            </div>
          </form>

          {error && <div className="error-banner" style={{ marginTop: '1rem' }}>{error}</div>}
        </section>
      )}

      {/* ────────── STEP 4: AI REPORT RESULTS ────────── */}
      {step === 4 && financialPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '0.5rem' }}>

          {/* 1. Financial Snapshot */}
          <section className="panel" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="panel-heading compact">
              <div><p className="eyebrow">Overview</p><h2>1. Business Financial Snapshot</h2></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
              {[
                { label: 'Own Contribution', value: formatINR(fs?.ownContribution || fs?.availableMargin), note: 'Margin money', border: 'var(--green)' },
                { label: 'Total Project Cost', value: formatINR(fs?.totalProjectCost), note: 'Total capital required', border: 'var(--amber)' },
                { label: 'Loan Amount', value: formatINR(fs?.cappedLoanAmount), note: '90% bank/scheme loan', border: 'var(--blue)' },
                { label: 'Recommended Scheme', value: selectedSchemeFinal?.schemeName || 'Direct Bank Loan', note: 'Governed scheme route', border: 'var(--amber)', small: true }
              ].map(item => (
                <div key={item.label} className="fin-card" style={{ borderLeft: `4px solid ${item.border}` }}>
                  <span className="fin-card-label">{item.label}</span>
                  <span className="fin-card-amount" style={{ fontSize: item.small ? '1rem' : undefined, color: item.border }}>{item.value}</span>
                  <p className="fin-card-note">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Scheme Details */}
          {selectedSchemeFinal && (
            <section className="panel" style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--blue)' }}>Selected Scheme</p><h2>2. Government Scheme Details</h2></div>
                <Landmark size={24} style={{ color: 'var(--blue)' }} />
              </div>
              <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '1.2rem' }}>{selectedSchemeFinal.schemeName}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Match Score: <strong style={{ color: 'var(--green)' }}>{selectedSchemeFinal.matchScore}%</strong> | {selectedSchemeFinal.eligibilityStatus}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Interest Rate</span><p style={{ margin: 0, fontWeight: 700, color: 'var(--green)' }}>{selectedSchemeFinal.interestRate}% p.a.</p></div>
                    <div><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tenure</span><p style={{ margin: 0, fontWeight: 700 }}>{(selectedSchemeFinal.tenureMonths || 0) / 12} Years</p></div>
                    <div><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Moratorium</span><p style={{ margin: 0, fontWeight: 700, color: 'var(--amber)' }}>{selectedSchemeFinal.moratoriumMonths} Months</p></div>
                  </div>
                </div>
                {selectedSchemeFinal.reasons?.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Why this scheme was matched:</h4>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.88rem', lineHeight: 1.7 }}>
                      {selectedSchemeFinal.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. EMI Summary */}
          <section className="panel">
            <div className="panel-heading compact">
              <div><p className="eyebrow">Repayment Terms</p><h2>3. EMI &amp; Repayment Summary</h2></div>
              <Clock size={22} style={{ color: 'var(--purple)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
              {[
                { label: 'Monthly EMI', value: formatINR(fs?.monthlyEMI), color: 'var(--purple)', note: 'Monthly installment' },
                { label: 'Total Interest', value: formatINR(fs?.totalInterest), color: 'var(--orange)', note: 'Total interest over tenure' },
                { label: 'Total Repayment', value: formatINR(fs?.totalRepayment), color: 'var(--blue)', note: 'Principal + Interest' },
                { label: 'Moratorium', value: `${fs?.moratoriumMonths || 0} Months`, color: 'var(--green)', note: 'No principal repayment required' }
              ].map(item => (
                <div key={item.label} className="fin-card" style={{ borderLeft: `4px solid ${item.color}` }}>
                  <span className="fin-card-label">{item.label}</span>
                  <span className="fin-card-amount" style={{ color: item.color }}>{item.value}</span>
                  <p className="fin-card-note">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Shop Expenses */}
          {financialPlan.shopExpenses && (
            <section className="panel">
              <div className="panel-heading compact">
                <div><p className="eyebrow">Monthly Costs</p><h2>4. Shop Expense Breakdown</h2></div>
                <Calculator size={22} style={{ color: 'var(--teal)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                {[
                  { label: 'Shop Rent', value: formatINR(financialPlan.shopExpenses.shopRent) },
                  { label: 'Product / Inventory', value: formatINR(financialPlan.shopExpenses.productMaintenanceCost) },
                  { label: `Labour (${financialPlan.shopExpenses.numberOfLabours} workers)`, value: formatINR(financialPlan.shopExpenses.totalLabourCost) },
                  { label: 'Other Expenses', value: formatINR(financialPlan.shopExpenses.otherExpenses) }
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.9rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.label}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontWeight: 700, fontSize: '1.05rem' }}>{item.value}</p>
                  </div>
                ))}
                <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '0.9rem 1rem', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--amber)' }}>Total Monthly Expenses</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 700, fontSize: '1.2rem', color: 'var(--amber)' }}>{formatINR(financialPlan.shopExpenses.totalMonthlyExpenses || financialPlan.shopExpenses.totalMonthly)}</p>
                </div>
              </div>
            </section>
          )}

          {/* 5. Feasibility Score */}
          <section className="panel">
            <div className="panel-heading compact">
              <div><p className="eyebrow">Combined Score</p><h2>5. Financial Feasibility</h2></div>
              <ShieldCheck size={22} style={{ color: 'var(--green)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1.25rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ textAlign: 'center', padding: '1rem 2rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overall Feasibility Score</span>
                <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0', color: feasibilityScore >= 70 ? 'var(--green)' : 'var(--amber)' }}>{feasibilityScore}/100</h2>
                <span className="result-niche-tag" style={{ background: feasibilityScore >= 70 ? 'rgba(46,125,50,0.2)' : 'rgba(245,158,11,0.2)', color: feasibilityScore >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                  {financialPlan.interpretation || 'Promising'}
                </span>
              </div>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Market Opportunity', score: feasibilityBreakdown?.marketDemand?.score ?? 75 },
                  { label: 'Capital Adequacy', score: feasibilityBreakdown?.capitalAdequacy?.score ?? 80 },
                  { label: 'Loan Sustainability', score: feasibilityBreakdown?.financialSustainability?.score ?? 70 }
                ].map(item => (
                  <div key={item.label}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
                    <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1rem' }}>{item.score}/100</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. AI Executive Summary + Scheme Explanation */}
          {ai && (
            <section className="panel" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--amber)' }}>AI Advisor</p><h2>6. Business Advisory Summary</h2></div>
                <Sparkles size={22} style={{ color: 'var(--amber)' }} />
              </div>
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {ai.executiveSummary && (
                  <div>
                    <h4 style={{ color: 'var(--amber)', margin: '0 0 0.5rem 0' }}>Executive Summary</h4>
                    <p style={{ lineHeight: 1.7, margin: 0 }}>{renderMd(ai.executiveSummary)}</p>
                  </div>
                )}
                {ai.schemeExplanation && (
                  <div>
                    <h4 style={{ color: 'var(--blue)', margin: '0 0 0.5rem 0' }}>Scheme Evaluation</h4>
                    <p style={{ lineHeight: 1.7, margin: 0 }}>{renderMd(ai.schemeExplanation)}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 7. Revenue Tips */}
          {ai?.revenueTips?.length > 0 && (
            <section className="panel" style={{ border: '1px solid rgba(46,125,50,0.3)', background: 'linear-gradient(135deg, rgba(46,125,50,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--green)' }}>Revenue Growth</p><h2>7. Revenue Improvement Strategies</h2></div>
                <TrendingUp size={22} style={{ color: 'var(--green)' }} />
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: '1rem 0 0 0', lineHeight: 1.8 }}>
                {ai.revenueTips.map((tip, i) => <li key={i}>{renderMd(tip)}</li>)}
              </ul>
            </section>
          )}

          {/* 8. Threat Analysis */}
          {ai?.threatAnalysis && (
            <section className="panel" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--red, #ef4444)' }}>Risk Analysis</p><h2>8. Threat Analysis</h2></div>
                <AlertTriangle size={22} style={{ color: '#ef4444' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                {ai.threatAnalysis.marketThreats?.length > 0 && (
                  <div>
                    <h4 style={{ color: '#f97316', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Market Threats</h4>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
                      {ai.threatAnalysis.marketThreats.map((t, i) => <li key={i}>{renderMd(t)}</li>)}
                    </ul>
                  </div>
                )}
                {ai.threatAnalysis.financialThreats?.length > 0 && (
                  <div>
                    <h4 style={{ color: '#ef4444', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Financial Threats</h4>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
                      {ai.threatAnalysis.financialThreats.map((t, i) => <li key={i}>{renderMd(t)}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 9. Business Roadmap */}
          {ai?.businessRoadmap?.length > 0 && (
            <section className="panel" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--purple)' }}>12-Month Plan</p><h2>9. Business Roadmap</h2></div>
                <Map size={22} style={{ color: 'var(--purple)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                {ai.businessRoadmap.map((phase, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 40, height: 40, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--purple)' }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.9rem 1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--purple)', fontSize: '0.95rem' }}>{phase.milestone}</h4>
                        <span style={{ fontSize: '0.78rem', background: 'rgba(139,92,246,0.15)', padding: '0.2rem 0.7rem', borderRadius: 20, color: 'var(--purple)' }}>{phase.month}</span>
                      </div>
                      {Array.isArray(phase.actions) && (
                        <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.85rem', lineHeight: 1.7 }}>
                          {phase.actions.map((action, j) => <li key={j}>{action}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 10. Key Financial Advice + Recommendations */}
          {(ai?.financialAdvice?.length > 0 || ai?.recommendations?.length > 0) && (
            <section className="panel" style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'linear-gradient(135deg, rgba(20,184,166,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
              <div className="panel-heading compact">
                <div><p className="eyebrow" style={{ color: 'var(--teal)' }}>Guidance</p><h2>10. Key Advice &amp; Recommendations</h2></div>
                <Zap size={22} style={{ color: 'var(--teal)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.25rem' }}>
                {ai.financialAdvice?.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--teal)', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Financial Advice</h4>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
                      {ai.financialAdvice.map((item, i) => <li key={i}>{renderMd(item)}</li>)}
                    </ul>
                  </div>
                )}
                {ai.recommendations?.length > 0 && (
                  <div>
                    <h4 style={{ color: 'var(--blue)', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Action Steps</h4>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
                      {ai.recommendations.map((item, i) => <li key={i}>{renderMd(item)}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, lineHeight: 1.6 }}>
            ⚠️ {financialPlan.disclaimer}
          </p>

          {/* Re-start button */}
          <button onClick={() => { setStep(1); setFinancialPlan(null); setMatchedSchemes([]); setSelectedScheme(null); }} className="secondary-button" style={{ alignSelf: 'flex-start' }}>
            <ArrowLeft size={16} /> Start Over
          </button>
        </div>
      )}
    </div>
  );
}

export default FinancialStructuring;
