import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { CustomerListPage } from './pages/CustomerListPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { StockMovementLogPage } from './pages/StockMovementLogPage';

function Protected({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/customers"
            element={
              <Protected>
                <CustomerListPage />
              </Protected>
            }
          />
          <Route
            path="/customers/new"
            element={
              <Protected>
                <CustomerFormPage />
              </Protected>
            }
          />
          <Route
            path="/customers/:id/edit"
            element={
              <Protected>
                <CustomerFormPage />
              </Protected>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <Protected>
                <CustomerDetailPage />
              </Protected>
            }
          />
          <Route
            path="/products"
            element={
              <Protected>
                <ProductListPage />
              </Protected>
            }
          />
          <Route
            path="/products/new"
            element={
              <Protected>
                <ProductFormPage />
              </Protected>
            }
          />
          <Route
            path="/products/:id/edit"
            element={
              <Protected>
                <ProductFormPage />
              </Protected>
            }
          />
          <Route
            path="/products/:id"
            element={
              <Protected>
                <ProductDetailPage />
              </Protected>
            }
          />
          <Route
            path="/stock-movements"
            element={
              <Protected>
                <StockMovementLogPage />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
