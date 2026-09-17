import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import AnalysisResult from '../pages/AnalysisResult.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import History from '../pages/History.jsx';
import Chat from '../pages/Chat.jsx';
import Landing from '../pages/Landing.jsx';
import FinancialStructuring from '../pages/FinancialStructuring.jsx';
import LanguageSelect from '../pages/LanguageSelect.jsx';

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hasLanguage = typeof window !== 'undefined' ? localStorage.getItem('app_language') : null;
    if (!hasLanguage && location.pathname !== '/select-language') {
      const returnTo = location.pathname + location.search;
      navigate(`/select-language?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <Routes>
      <Route path="/select-language" element={<LanguageSelect />} />
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis/:id" element={<AnalysisResult />} />
      <Route path="/financial-structuring/:analysisId" element={<FinancialStructuring />} />
      <Route path="/history" element={<History />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
