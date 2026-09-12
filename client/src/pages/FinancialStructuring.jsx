import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Landmark,
  Percent,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck,
  Building2,
  Calculator,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { submitFinancialStructuring } from '../api/analysisApi.js';
import PageLoader from '../components/PageLoader.jsx';
import LiquidGlass from '../components/LiquidGlass.jsx';
import { renderMd } from '../utils/renderMd.jsx';

function formatINR(val) {
  if (!Number.isFinite(Number(val))) return '₹0';
  return '₹' + Math.round(Number(val)).toLocaleString('en-IN');
}

function FinancialStructuring() {
  const { analysisId } = useParams();
  const { loadAnalysis, state: analysisState } = useAnalysis();
  const analysisDocument = analysisState.currentAnalysis;

  // Form State (Maximum 7 inputs)
  const [location, setLocation] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [ownInvestment, setOwnInvestment] = useState('');
  const [isExistingBusiness, setIsExistingBusiness] = useState(false);
  const [estimatedMonthlyRevenue, setEstimatedMonthlyRevenue] = useState('');
  const [estimatedMonthlyExpenses, setEstimatedMonthlyExpenses] = useState('');
  const [assetStatus, setAssetStatus] = useState('Rented Shop');

  // Result State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [financialPlan, setFinancialPlan] = useState(null);

  useEffect(() => {
    if (analysisId) {
      loadAnalysis(analysisId).catch(() => undefined);
    }
  }, [analysisId, loadAnalysis]);

  useEffect(() => {
    if (analysisDocument) {
      if (analysisDocument.input?.location) {
        setLocation(analysisDocument.input.location);
      }
      if (analysisDocument.input?.businessType) {
        setBusinessCategory(analysisDocument.input.businessType);
      }
    }
  }, [analysisDocument]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        analysisId,
        location,
        businessCategory,
        ownInvestment: Number(ownInvestment),
        isExistingBusiness: Boolean(isExistingBusiness),
        estimatedMonthlyRevenue: Number(estimatedMonthlyRevenue),
        estimatedMonthlyExpenses: Number(estimatedMonthlyExpenses),
        assetStatus
      };

      const res = await submitFinancialStructuring(payload);

      if (res) {
        setFinancialPlan(res);
      } else {
        throw new Error('Failed to generate financial plan.');
      }
    } catch (err) {
      console.error('Financial structuring generation failed:', err);
      setError(err.message || 'Error generating financial plan.');
    } finally {
      setLoading(false);
    }
  };

  if (analysisState.loading && !analysisDocument) {
    return <PageLoader label="Loading market context" />;
  }

  const selectedScheme = financialPlan?.schemeMatch?.selectedScheme;
  const financialStructure = financialPlan?.financialStructure;
  const projectBudget = financialPlan?.projectBudget || [];
  const feasibilityScore = financialPlan?.feasibilityScore ?? 75;
  const feasibilityBreakdown = financialPlan?.feasibilityBreakdown;
  const aiExplanation = financialPlan?.aiExplanation;

  return (
    <div className="financial-page animate-in">
      {/* ── Top action bar ───────────────────────────────────────────── */}
      <div className="page-actions result-page-actions">
        <LiquidGlass
          tagName={Link}
          to={`/analysis/${analysisId}`}
          className="secondary-button liquid-glass"
          depth={15}
          blur={8}
          tint={0.06}
          tintColor="#ffffff"
          glint={20}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Market Analysis
        </LiquidGlass>
      </div>

      {/* ── Page Hero ────────────────────────────────────────────────── */}
      <section className="result-header-hero" aria-label="Financial Structuring Hero">
        <div className="result-header-meta">
          <span className="result-business-badge">
            <Building2 size={13} aria-hidden="true" />
            Module 2 — Financial Structuring
          </span>
        </div>
        <h1 className="result-location-title" style={{ fontSize: '2.2rem' }}>
          Government Scheme & Financial Advisory
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '750px', marginTop: '0.5rem' }}>
          Optimized margin money calculations, government subsidy matching, and loan repayment scheduling powered by deterministic financial engines.
        </p>
      </section>

      {/* ── Form Section ────────────────────────────────────────────── */}
      <section className="panel form-panel" style={{ marginTop: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow" style={{ color: 'var(--amber)' }}>Input Parameters</p>
            <h2>Financial Structuring Inputs</h2>
          </div>
          <Calculator size={22} style={{ color: 'var(--amber)' }} aria-hidden="true" />
        </div>

        <form onSubmit={handleSubmit} className="financial-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          {/* 1. Location (Auto-filled from Module 1) */}
          <div className="form-group">
            <label className="form-label" htmlFor="location">
              1. Business Location <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>(Auto-filled)</span>
            </label>
            <input
              id="location"
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g. Madurai, Tamil Nadu"
            />
          </div>

          {/* 2. Business Category (Auto-filled from Module 1) */}
          <div className="form-group">
            <label className="form-label" htmlFor="businessCategory">
              2. Business Category <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.85rem' }}>(Auto-filled)</span>
            </label>
            <input
              id="businessCategory"
              type="text"
              className="form-input"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              required
              readOnly
              style={{ opacity: 0.8, cursor: 'not-allowed' }}
              placeholder="e.g. Coffee shop"
            />
          </div>

          {/* 3. Own Investment (Margin Money) */}
          <div className="form-group">
            <label className="form-label" htmlFor="ownInvestment">
              3. Own Investment (Margin Money in ₹) *
            </label>
            <input
              id="ownInvestment"
              type="number"
              min="5000"
              step="5000"
              className="form-input"
              value={ownInvestment}
              onChange={(e) => setOwnInvestment(e.target.value)}
              required
              placeholder="e.g. 100000"
            />
          </div>

          {/* 4. Business Type (New vs Existing) */}
          <div className="form-group">
            <label className="form-label">4. Business Type *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="businessStage"
                  checked={!isExistingBusiness}
                  onChange={() => setIsExistingBusiness(false)}
                />
                <span>New Business</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="businessStage"
                  checked={isExistingBusiness}
                  onChange={() => setIsExistingBusiness(true)}
                />
                <span>Existing Business</span>
              </label>
            </div>
          </div>

          {/* 5. Estimated Monthly Revenue */}
          <div className="form-group">
            <label className="form-label" htmlFor="estimatedMonthlyRevenue">
              5. Estimated Monthly Revenue (₹) *
            </label>
            <input
              id="estimatedMonthlyRevenue"
              type="number"
              min="0"
              step="5000"
              className="form-input"
              value={estimatedMonthlyRevenue}
              onChange={(e) => setEstimatedMonthlyRevenue(e.target.value)}
              required
              placeholder="e.g. 250000"
            />
          </div>

          {/* 6. Estimated Monthly Operating Expenses */}
          <div className="form-group">
            <label className="form-label" htmlFor="estimatedMonthlyExpenses">
              6. Estimated Monthly Operating Expenses (₹) *
            </label>
            <input
              id="estimatedMonthlyExpenses"
              type="number"
              min="0"
              step="5000"
              className="form-input"
              value={estimatedMonthlyExpenses}
              onChange={(e) => setEstimatedMonthlyExpenses(e.target.value)}
              required
              placeholder="e.g. 150000"
            />
          </div>

          {/* 7. Business Assets Available */}
          <div className="form-group">
            <label className="form-label" htmlFor="assetStatus">7. Business Assets Available</label>
            <select
              id="assetStatus"
              className="form-input"
              value={assetStatus}
              onChange={(e) => setAssetStatus(e.target.value)}
              style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
            >
              <option value="None">None</option>
              <option value="Own Shop">Own Shop</option>
              <option value="Own Land">Own Land</option>
              <option value="Rented Shop">Rented Shop</option>
            </select>
          </div>

          {/* Submit Button */}
          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="cta-ai-button"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 600 }}
            >
              {loading ? 'Processing Financial Structure...' : 'Generate Financial Plan'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner" style={{ marginTop: '1rem' }}>
            {error}
          </div>
        )}
      </section>

      {/* ── Financial Advisory Result Sections ──────────────────────── */}
      {financialPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>

          {/* 1. Business Financial Snapshot */}
          <section className="panel" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Overview</p>
                <h2>1. Business Financial Snapshot</h2>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="fin-card fin-card--capex">
                <span className="fin-card-label">Own Investment</span>
                <span className="fin-card-amount">{formatINR(financialStructure?.availableMargin)}</span>
                <p className="fin-card-note">Margin Money (10%)</p>
              </div>
              <div className="fin-card fin-card--opex">
                <span className="fin-card-label">Estimated Project Cost</span>
                <span className="fin-card-amount">{formatINR(financialStructure?.calculatedProjectCost)}</span>
                <p className="fin-card-note">Total capital required</p>
              </div>
              <div className="fin-card fin-card--breakeven">
                <span className="fin-card-label">Potential Loan Amount</span>
                <span className="fin-card-amount">{formatINR(financialStructure?.cappedLoanAmount)}</span>
                <p className="fin-card-note">90% Bank/Scheme loan</p>
              </div>
              <div className="fin-card" style={{ borderLeft: '4px solid var(--amber)' }}>
                <span className="fin-card-label">Recommended Scheme</span>
                <span className="fin-card-amount" style={{ fontSize: '1.2rem', color: 'var(--amber)' }}>
                  {selectedScheme?.schemeName || 'Direct Bank Loan'}
                </span>
                <p className="fin-card-note">Governed scheme route</p>
              </div>
            </div>
          </section>

          {/* 2. Government Scheme Match */}
          <section className="panel" style={{ border: '1px solid rgba(59,130,246,0.3)', background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow" style={{ color: 'var(--blue)' }}>Matched Subsidy & Credit Scheme</p>
                <h2>2. Government Scheme Match</h2>
              </div>
              <Landmark size={24} style={{ color: 'var(--blue)' }} />
            </div>

            {selectedScheme ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '1.3rem' }}>{selectedScheme.schemeName} ({selectedScheme.schemeCode})</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Match Score: <strong style={{ color: 'var(--green)' }}>{selectedScheme.matchScore}%</strong> | Eligibility: <span style={{ color: 'var(--green)' }}>{selectedScheme.eligibilityStatus}</span></p>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interest Rate</span>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--green)' }}>{selectedScheme.interestRate}% p.a.</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tenure</span>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{selectedScheme.tenureMonths / 12} Years</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Moratorium</span>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--amber)' }}>{selectedScheme.moratoriumMonths} Months</p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Eligibility & Scheme Reasons:</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    {(selectedScheme.reasons || []).map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1rem' }}>
                {financialPlan.schemeMatch?.noSchemeReason || 'No exact matching government scheme found for this project cost.'}
              </p>
            )}
          </section>

          {/* 3. Loan Structure */}
          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Capital Flow</p>
                <h2>3. Loan Structure</h2>
              </div>
              <Layers size={22} style={{ color: 'var(--teal)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Own Margin (10%)</span>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--green)', fontSize: '1.4rem' }}>{formatINR(financialStructure?.availableMargin)}</h3>
              </div>
              <ArrowRight size={24} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Project Cost (100%)</span>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--amber)', fontSize: '1.4rem' }}>{formatINR(financialStructure?.calculatedProjectCost)}</h3>
              </div>
              <ArrowRight size={24} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loan Amount (90%)</span>
                <h3 style={{ margin: '0.25rem 0', color: 'var(--blue)', fontSize: '1.4rem' }}>{formatINR(financialStructure?.cappedLoanAmount)}</h3>
              </div>
            </div>
          </section>

          {/* 4. EMI Summary */}
          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Repayment Terms</p>
                <h2>4. EMI Summary</h2>
              </div>
              <Clock size={22} style={{ color: 'var(--purple)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
              <div className="fin-card" style={{ borderLeft: '4px solid var(--purple)' }}>
                <span className="fin-card-label">Monthly EMI</span>
                <span className="fin-card-amount" style={{ color: 'var(--purple)' }}>{formatINR(financialStructure?.monthlyEMI)}</span>
                <p className="fin-card-note">Monthly installment</p>
              </div>
              <div className="fin-card" style={{ borderLeft: '4px solid var(--orange)' }}>
                <span className="fin-card-label">Total Interest</span>
                <span className="fin-card-amount" style={{ color: 'var(--orange)' }}>{formatINR(financialStructure?.totalInterest)}</span>
                <p className="fin-card-note">Total interest over tenure</p>
              </div>
              <div className="fin-card" style={{ borderLeft: '4px solid var(--blue)' }}>
                <span className="fin-card-label">Total Repayment</span>
                <span className="fin-card-amount">{formatINR(financialStructure?.totalRepayment)}</span>
                <p className="fin-card-note">Principal + Interest</p>
              </div>
              <div className="fin-card" style={{ borderLeft: '4px solid var(--green)' }}>
                <span className="fin-card-label">Moratorium</span>
                <span className="fin-card-amount" style={{ color: 'var(--green)' }}>{financialStructure?.moratoriumMonths || 0} Months</span>
                <p className="fin-card-note">No principal repayment required</p>
              </div>
            </div>
          </section>

          {/* 5. Project Budget Breakdown */}
          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Cost Distribution</p>
                <h2>5. Project Budget Breakdown</h2>
              </div>
              <PieIcon size={22} style={{ color: 'var(--teal)' }} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--amber)', margin: '0.5rem 0 1rem 0' }}>
              ⚠️ Clearly labeled as <strong>Estimated Planning Values</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {projectBudget.map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.category}</span>
                    <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.9rem' }}>{item.percentage}%</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>{formatINR(item.amount)}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Financial Feasibility */}
          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Combined Score</p>
                <h2>6. Financial Feasibility</h2>
              </div>
              <ShieldCheck size={22} style={{ color: 'var(--green)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1.25rem', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ textAlign: 'center', padding: '1rem 2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overall Feasibility Score</span>
                <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0', color: feasibilityScore >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                  {feasibilityScore}/100
                </h2>
                <span className="result-niche-tag" style={{ background: feasibilityScore >= 70 ? 'rgba(46,125,50,0.2)' : 'rgba(245,158,11,0.2)', color: feasibilityScore >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                  {financialPlan.interpretation || 'Promising'}
                </span>
              </div>

              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Market Opportunity</span>
                  <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1rem' }}>{feasibilityBreakdown?.marketDemand?.score ?? 75}/100</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capital Adequacy</span>
                  <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1rem' }}>{feasibilityBreakdown?.capitalAdequacy?.score ?? 80}/100</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loan Sustainability</span>
                  <p style={{ margin: '0.25rem 0', fontWeight: 600, fontSize: '1rem' }}>{feasibilityBreakdown?.financialSustainability?.score ?? 70}/100</p>
                </div>
              </div>
            </div>
          </section>

          {/* 7. AI Financial Advice */}
          <section className="panel" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(15,23,42,0.6) 100%)' }}>
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow" style={{ color: 'var(--amber)' }}>AI Advisor Explanation</p>
                <h2>7. AI Financial Advice</h2>
              </div>
              <Sparkles size={22} style={{ color: 'var(--amber)' }} />
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ color: 'var(--amber)', margin: '0 0 0.5rem 0' }}>Executive Summary</h4>
                <p style={{ lineHeight: '1.6', color: 'var(--text-main)', margin: 0 }}>
                  {renderMd(aiExplanation?.executiveSummary || 'Financial plan generated successfully.')}
                </p>
              </div>

              {aiExplanation?.schemeExplanation && (
                <div>
                  <h4 style={{ color: 'var(--blue)', margin: '0 0 0.5rem 0' }}>Scheme Evaluation</h4>
                  <p style={{ lineHeight: '1.6', color: 'var(--text-main)', margin: 0 }}>
                    {renderMd(aiExplanation.schemeExplanation)}
                  </p>
                </div>
              )}

              {aiExplanation?.financialAdvice?.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--green)', margin: '0 0 0.5rem 0' }}>Key Advice</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
                    {aiExplanation.financialAdvice.map((item, idx) => (
                      <li key={idx}>{renderMd(item)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiExplanation?.riskFactors?.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--red)', margin: '0 0 0.5rem 0' }}>Financial Risks to Watch</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
                    {aiExplanation.riskFactors.map((item, idx) => (
                      <li key={idx}>{renderMd(item)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

export default FinancialStructuring;
