import React from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { Shell } from './components/Shell';
import { ToastProvider } from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { Incidents, NewIncidentForm } from './pages/Incidents';
import { IncidentDetail } from './pages/IncidentDetail';
import { MemoryPage } from './pages/Memory';
import { Agent } from './pages/Agent';
import { Demo } from './pages/Demo';
import './styles.css';

// Wrapper for NewIncidentForm that reads location state (for pre-fills from Demo page)
const NewIncidentPage: React.FC = () => {
  const location = useLocation();
  const prefill = (location.state as any)?.prefill;
  return <NewIncidentForm onCreated={() => {}} prefill={prefill} />;
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/new" element={<NewIncidentPage />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </ToastProvider>
  );
};

export default App;
