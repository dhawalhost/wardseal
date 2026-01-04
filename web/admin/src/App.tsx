import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "@/components/theme-provider";
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

import AccessRequests from './pages/AccessRequests';
import RequestAccess from './pages/RequestAccess';
import Roles from './pages/Roles';
import AuditLogs from './pages/AuditLogs';
import Campaigns from './pages/Campaigns';

import SSOConfig from './pages/SSOConfig';
import Connectors from './pages/Connectors';
import Developer from './pages/Developer';
import Passkeys from './pages/Passkeys';
import Branding from './pages/Branding';
import Webhooks from './pages/Webhooks';
import Devices from './pages/Devices';
import MFASetup from './pages/MFASetup';
import Organizations from './pages/Organizations';
import DeveloperApps from './pages/DeveloperApps';

// Basic protected route
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="wardseal-ui-theme">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<Landing />} />

          {/* Protected Routes using Layout */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/requests" element={<AccessRequests />} />
                    <Route path="/request-access" element={<RequestAccess />} />
                    <Route path="/roles" element={<Roles />} />
                    <Route path="/audit" element={<AuditLogs />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/sso" element={<SSOConfig />} />
                    <Route path="/connectors" element={<Connectors />} />
                    <Route path="/developer" element={<Developer />} />
                    <Route path="/passkeys" element={<Passkeys />} />
                    <Route path="/branding" element={<Branding />} />
                    <Route path="/webhooks" element={<Webhooks />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/mfa" element={<MFASetup />} />
                    <Route path="/organizations" element={<Organizations />} />
                    <Route path="/apps" element={<DeveloperApps />} />

                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;

