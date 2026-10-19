import type { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProblemList } from './pages/ProblemList';
import { ProblemSolve } from './pages/ProblemSolve';
import { TopicRoadmap } from './pages/TopicRoadmap';
import { CompanyList } from './pages/CompanyList';
import { CompanyDetail } from './pages/CompanyDetail';
import { Assessments } from './pages/Assessments';
import { AssessmentTake } from './pages/AssessmentTake';
import { Analytics } from './pages/Analytics';
import { Bookmarks } from './pages/Bookmarks';
import { Settings } from './pages/Settings';

export const App: FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="problems" element={<ProblemList />} />
          <Route path="problems/:slug" element={<ProblemSolve />} />
          <Route path="roadmap" element={<TopicRoadmap />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="companies/:slug" element={<CompanyDetail />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="assessments/:id/take" element={<AssessmentTake />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <AuthModal />
    </AuthProvider>
  );
};

export default App;

