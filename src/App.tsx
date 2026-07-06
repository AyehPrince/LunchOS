import React, { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Register from './components/Register';
import EmployeeDashboard from './components/EmployeeDashboard';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';

import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import VendorDashboard from './components/VendorDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.role === 'super_admin') return <Navigate to="/super-admin" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'vendor') return <Navigate to="/vendor" />;
  return <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 font-sans">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <EmployeeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/super-admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor" element={
              <ProtectedRoute allowedRoles={['vendor']}>
                <VendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/" element={<HomeRedirect />} />
          </Routes>
          <Toaster position="top-center" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
