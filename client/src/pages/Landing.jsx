import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import {
  MapPinned,
  Search,
  Radar,
  BrainCircuit,
  MessageSquareText,
  History,
  ArrowRight,
  MapPin,
  BriefcaseBusiness,
  Sparkles,
  ChevronRight,
  Target,
  TrendingUp,
  Shield,
  BarChart3,
  Zap,
  CheckCircle2,
  Star
} from 'lucide-react';

import '../styles/landing.css';

/* ── Intersection Observer hook for scroll-reveal animations ─── */
function useInView(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

/* ── Animated counter for numbers ────────────────────────────── */
function AnimatedNumber({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, isVisible] = useInView();

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Feature Card Component ──────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, accentClass, delay }) {
  const [ref, isVisible] = useInView();

  return (
    <div
      ref={ref}
      className={`landing-feature-card ${accentClass} ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="feature-card-icon">
        <Icon size={24} />
      </div>
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-desc">{description}</p>
      <div className="feature-card-shine" aria-hidden="true" />
    </div>
  );
}

/* ── Workflow Step Component ──────────────────────────────────── */
function WorkflowStep({ step, title, description, detail, isLast, delay }) {
  const [ref, isVisible] = useInView();

  return (
    <div
      ref={ref}
      className={`workflow-step ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="workflow-step-indicator">
        <div className="workflow-step-number">{step}</div>
        {!isLast && <div className="workflow-step-line" />}
      </div>
      <div className="workflow-step-content">
        <h3 className="workflow-step-title">{title}</h3>
        <p className="workflow-step-desc">{description}</p>
        {detail && <div className="workflow-step-detail">{detail}</div>}
      </div>
    </div>
  );
}

/* ── Main Landing Page ───────────────────────────────────────── */
function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [radiusValue, setRadiusValue] = useState(5);
  const [heroRef, heroVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();

  function handleAnalyze(e) {
    e.preventDefault();
    navigate('/dashboard');
  }

  return (
    <div className="landing-page" id="landing-top">
      {/* ── Background effects ──────────────────────────────── */}
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-orb landing-orb--1" />
        <div className="landing-orb landing-orb--2" />
        <div className="landing-orb landing-orb--3" />
      </div>

      {/* ── Floating Navbar ─────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#landing-top" className="landing-brand">
            <img src="/images/marketsense_logo.png" className="brand-logo-img" alt="MarketSense Logo" />
            <span>MarketSense</span>
          </a>

          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#features">{t('nav.features')}</a>
            <a href="#how-it-works">{t('nav.howItWorks')}</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LanguageSwitcher />

            <button
              className="landing-nav-cta"
              onClick={() => navigate('/dashboard')}
            >
              {t('common.launchApp')}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ══════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className={`landing-hero ${heroVisible ? 'visible' : ''}`}
      >
        <div className="hero-badge">
          <Sparkles size={12} />
          <span>{t('landing.heroBadge')}</span>
        </div>

        <h1 className="hero-headline">
          {t('landing.headline')}
          <br />
          <span className="hero-headline-italic">{t('landing.headlineItalic')}</span>
        </h1>

        <p className="hero-subheadline">
          {t('landing.subheadline')}
        </p>

        {/* ── Mockup Search Widget ──────────────────────────── */}
        <form className="hero-search-widget" onSubmit={handleAnalyze}>
          <div className="hero-field-group">
            <div className="hero-field">
              <MapPin size={16} className="hero-field-icon" />
              <input
                type="text"
                placeholder={t('landing.mockLocation')}
                className="hero-input"
                readOnly
              />
            </div>

            <div className="hero-field">
              <BriefcaseBusiness size={16} className="hero-field-icon" />
              <input
                type="text"
                placeholder={t('landing.mockBusiness')}
                className="hero-input"
                readOnly
              />
            </div>
          </div>

          <div className="hero-field-group hero-field-group--bottom">
            <div className="hero-field hero-field--niche">
              <Sparkles size={16} className="hero-field-icon" />
              <input
                type="text"
                placeholder={t('landing.mockNiche')}
                className="hero-input"
                readOnly
              />
            </div>

            <div className="hero-field hero-field--radius">
              <Radar size={16} className="hero-field-icon" />
              <div className="hero-radius-control">
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={radiusValue}
                  onChange={(e) => setRadiusValue(Number(e.target.value))}
                  className="hero-radius-slider"
                />
                <span className="hero-radius-label">{radiusValue} km</span>
              </div>
            </div>
          </div>

          <button type="submit" className="hero-cta-button">
            <Search size={18} />
            <span>{t('landing.analyzeBtn')}</span>
            <div className="hero-cta-glow" aria-hidden="true" />
          </button>
        </form>

        {/* ── Trust Indicators ──────────────────────────────── */}
        <div className="hero-trust-bar">
          <div className="trust-item">
            <CheckCircle2 size={14} />
            <span>{t('landing.trustGoogle')}</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <BrainCircuit size={14} />
            <span>{t('landing.trustMistral')}</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Shield size={14} />
            <span>{t('landing.trustRealtime')}</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — STATS BAR
          ══════════════════════════════════════════════════════ */}
      <section className="landing-stats">
        <div className="stat-item">
          <strong><AnimatedNumber target={100} suffix="+" /></strong>
          <span>{t('landing.statBusiness')}</span>
        </div>
        <div className="stat-item">
          <strong><AnimatedNumber target={50} suffix="M+" /></strong>
          <span>{t('landing.statPlaces')}</span>
        </div>
        <div className="stat-item">
          <strong><AnimatedNumber target={360} suffix="°" /></strong>
          <span>{t('landing.statIntel')}</span>
        </div>
        <div className="stat-item">
          <strong>&lt;30s</strong>
          <span>{t('landing.statTime')}</span>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — FEATURE HIGHLIGHTS
          ══════════════════════════════════════════════════════ */}
      <section className="landing-features" id="features">
        <div className="section-header">
          <span className="section-eyebrow">{t('landing.featuresEyebrow')}</span>
          <h2 className="section-title">
            {t('landing.featuresTitle')}
            <span className="gradient-inline">{t('landing.featuresTitleHighlight')}</span>
          </h2>
          <p className="section-subtitle">
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        <div className="features-grid">
          <FeatureCard
            icon={Radar}
            title={t('landing.feature1Title')}
            description={t('landing.feature1Desc')}
            accentClass="accent-emerald"
            delay={0}
          />
          <FeatureCard
            icon={BrainCircuit}
            title={t('landing.feature2Title')}
            description={t('landing.feature2Desc')}
            accentClass="accent-cyan"
            delay={100}
          />
          <FeatureCard
            icon={MessageSquareText}
            title={t('landing.feature3Title')}
            description={t('landing.feature3Desc')}
            accentClass="accent-teal"
            delay={200}
          />
          <FeatureCard
            icon={History}
            title={t('landing.feature4Title')}
            description={t('landing.feature4Desc')}
            accentClass="accent-indigo"
            delay={300}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
          ══════════════════════════════════════════════════════ */}
      <section className="landing-workflow" id="how-it-works">
        <div className="section-header">
          <span className="section-eyebrow">{t('landing.workflowEyebrow')}</span>
          <h2 className="section-title">
            {t('landing.workflowTitle')}
            <span className="gradient-inline">{t('landing.workflowTitleHighlight')}</span>
          </h2>
          <p className="section-subtitle">
            {t('landing.workflowSubtitle')}
          </p>
        </div>

        <div className="workflow-container">
          <WorkflowStep
            step={1}
            title={t('landing.step1Title')}
            description={t('landing.step1Desc')}
            detail={
              <div className="workflow-mock-input">
                <div className="mock-input-row">
                  <MapPin size={14} />
                  <span>Downtown Austin, TX</span>
                </div>
                <div className="mock-input-row">
                  <BriefcaseBusiness size={14} />
                  <span>Specialty Espresso Coffee Shop</span>
                </div>
              </div>
            }
            delay={0}
          />
          <WorkflowStep
            step={2}
            title={t('landing.step2Title')}
            description={t('landing.step2Desc')}
            detail={
              <div className="workflow-mock-results">
                <div className="mock-competitor">
                  <Star size={12} className="star-filled" />
                  <span>4.7</span>
                  <span className="mock-name">Austin Java</span>
                  <span className="mock-dist">0.3 km</span>
                </div>
                <div className="mock-competitor">
                  <Star size={12} className="star-filled" />
                  <span>4.5</span>
                  <span className="mock-name">Houndstooth Coffee</span>
                  <span className="mock-dist">0.8 km</span>
                </div>
                <div className="mock-competitor">
                  <Star size={12} className="star-filled" />
                  <span>4.2</span>
                  <span className="mock-name">Merit Coffee</span>
                  <span className="mock-dist">1.2 km</span>
                </div>
              </div>
            }
            delay={150}
          />
          <WorkflowStep
            step={3}
            title={t('landing.step3Title')}
            description={t('landing.step3Desc')}
            detail={
              <div className="workflow-mock-score">
                <div className="mock-score-ring">
                  <svg viewBox="0 0 80 80" className="mock-ring-svg">
                    <circle cx="40" cy="40" r="34" className="ring-bg" />
                    <circle cx="40" cy="40" r="34" className="ring-fill" />
                  </svg>
                  <span className="mock-score-value">78</span>
                </div>
                <div className="mock-score-meta">
                  <span className="mock-grade">Grade: B+</span>
                  <span className="mock-verdict">High Viability</span>
                </div>
              </div>
            }
            isLast
            delay={300}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — FINAL CTA
          ══════════════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        className={`landing-cta ${ctaVisible ? 'visible' : ''}`}
      >
        <div className="cta-glow-bg" aria-hidden="true" />
        <h2 className="cta-headline">
          {t('landing.ctaHeadline')}
          <span className="gradient-inline">{t('landing.ctaHeadlineHighlight')}</span>
        </h2>
        <p className="cta-sub">
          {t('landing.ctaSub')}
        </p>
        <button
          className="cta-primary-button"
          onClick={() => navigate('/dashboard')}
        >
          <Target size={18} />
          <span>{t('landing.ctaBtn')}</span>
          <ArrowRight size={16} />
          <div className="cta-btn-glow" aria-hidden="true" />
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <img src="/images/marketsense_logo.png" className="brand-logo-img" alt="MarketSense Logo" style={{ height: '16px' }} />
            <span>MarketSense</span>
          </div>
          <div className="footer-meta">
            <Zap size={12} />
            <span>{t('landing.footerTag')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
