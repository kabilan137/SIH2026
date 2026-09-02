import { Navigate, Route, Routes } from 'react-router-dom';

import AnalysisResult from '../pages/AnalysisResult.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import History from '../pages/History.jsx';
import Chat from '../pages/Chat.jsx';
import Landing from '../pages/Landing.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis/:id" element={<AnalysisResult />} />
      <Route path="/history" element={<History />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
