
import * as ReactRouterDOM from 'react-router-dom';
import { Layout } from '../pages/Layout';
import { Login } from '../pages/Login';
import { PublicInscription } from '../pages/PublicInscription';
import { Dashboard } from '../pages/Dashboard';
import { Candidates } from '../pages/Candidates';
import { Companies } from '../pages/Companies';
import { PersonClients } from '../pages/PersonClients';
import { Jobs } from '../pages/Jobs';
import { Services } from '../pages/Services';
import { Orders } from '../pages/Orders';
import { Finance } from '../pages/Finance';
import { Settings } from '../pages/Settings';
import { RequireAuth } from '../components/RequireAuth';

const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM as any;

export const AppRouter = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/inscription" element={<PublicInscription />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="companies" element={<Companies />} />
          <Route path="person-clients" element={<PersonClients />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="services" element={<Services />} />
          <Route path="orders" element={<Orders />} />
          <Route path="finance" element={<Finance />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};
