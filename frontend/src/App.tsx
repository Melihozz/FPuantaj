import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CategoryProvider } from './context/CategoryContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { FullPageLoader } from './components/Loaders';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollPage from './pages/PayrollPage';
import LogPage from './pages/LogPage';
import TrafficFinesPage from './pages/TrafficFinesPage';
import OvertimePage from './pages/OvertimePage';
import CategoriesPage from './pages/CategoriesPage';

// Redirect authenticated users away from login page
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader label="Oturum doğrulanıyor..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<ErrorBoundary><PayrollPage /></ErrorBoundary>} />
        <Route path="/calisanlar" element={<ErrorBoundary><EmployeesPage /></ErrorBoundary>} />
        <Route path="/kategoriler" element={<ErrorBoundary><CategoriesPage /></ErrorBoundary>} />
        <Route path="/mesailer" element={<ErrorBoundary><OvertimePage /></ErrorBoundary>} />
        <Route path="/trafik-cezalari" element={<ErrorBoundary><TrafficFinesPage /></ErrorBoundary>} />
        <Route path="/log" element={<ErrorBoundary><LogPage /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CategoryProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </CategoryProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
