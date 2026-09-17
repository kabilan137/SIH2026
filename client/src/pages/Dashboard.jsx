import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import AnalysisProgressModal from '../components/AnalysisProgressModal.jsx';
import SearchForm from '../components/SearchForm.jsx';
import { useAnalysis } from '../hooks/useAnalysis.js';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { createAnalysis, state } = useAnalysis();

  async function handleSubmit(values) {
    const result = await createAnalysis({
      ...values,
      language: i18n.language || 'en'
    });
    navigate(`/analysis/${result.id}`);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1>{t('dashboard.title')}</h1>
        <p className="hero-tagline">
          {t('dashboard.tagline')}
        </p>
      </div>

      <SearchForm onSubmit={handleSubmit} loading={state.loading} />

      <AnalysisProgressModal isOpen={state.loading} progress={state.progress} status={state.status} />
      {state.error && <div className="error-banner">{state.error}</div>}
    </div>
  );
}

export default Dashboard;
