import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, Component, ReactNode, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import Header from "./Components/Header/Header";
import Dashboard from "./Components/Dashboard/Dashboard";
import Authentication from "./Components/Authentication/Authentication";
import Settings from "./Components/Settings/Settings";
import './App.scss';
import { ThemeProvider } from "./context/ThemeContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import UpdateProfile from "./Components/UpdateProfile/UpdateProfile";
import { NoAuthGuard } from './Components/Authentication/NoAuthGuard';
import { AuthGuard } from './Components/Authentication/AuthGuard';
import { AdminGuard } from './Components/Authentication/AdminGuard';
import ProfilePage from './Components/Profile/ProfilePage';
import { Provider } from 'react-redux';
import { store } from "./Redux/store";
import SavedPatentList from "./Components/SavedPatentList/savedPatentList";
import SessionHandler from "./Components/Authentication/SessionHandler";
import LandingPage from "./Components/LandingPage/LandingPage";
import Forum from "./Components/Forum/Forum";
import SubscriptionPage from "./Components/Subscription/SubscriptionPage";
import PatentHistory from "./Components/PatentHistory";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import PaymentHistory from "./Components/PaymentHistory";
import { GoogleOAuthProvider } from '@react-oauth/google';
// import { store } from './Redux/store';

// Error boundary to catch rendering errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("App crashed due to error:", error);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
          <h1>Something went wrong</h1>
          <p>Error: {this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()}>Reload Application</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to conditionally render Dashboard or AdminDashboard
const DashboardSelector = () => {
  const { user } = useAuth();
  const { isAdminMode } = useAdmin();
  
  // If user is admin and in admin mode, show admin dashboard
  if (user?.isAdmin && isAdminMode) {
    return <AdminDashboard />;
  }
  
  // Otherwise show regular dashboard
  return <Dashboard />;
};

const App = () => {
  // Get the sidebar behavior from localStorage
  const [sidebarBehavior, setSidebarBehavior] = useState<'auto' | 'manual'>(() => {
    const saved = localStorage.getItem('sidebarBehavior');
    return (saved === 'auto' || saved === 'manual') ? saved : 'auto';
  });

  // Add state for modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Make setIsModalOpen available globally
  useEffect(() => {
    (window as any).setIsModalOpen = setIsModalOpen;
    return () => {
      delete (window as any).setIsModalOpen;
    };
  }, []);

  // Handle sidebar behavior change
  const handleSidebarBehaviorChange = (behavior: 'auto' | 'manual') => {
    setSidebarBehavior(behavior);
  };

  // Create a context value for modal state
  const modalContextValue = {
    isModalOpen,
    setIsModalOpen
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_APP_GOOGLE_CLIENT_ID}>
            <AuthProvider>
              <AdminProvider>
                <ThemeProvider>
                  <Router>
                    <SessionHandler />
                    <Routes>
                      {/* Landing Page - Public */}
                      <Route path="/" element={<LandingPage />} />
                      
                      {/* Forum Page - Public */}
                      <Route path="/forum" element={<Forum />} />
                      
                      {/* Subscription Page - Public with auth features */}
                      <Route path="/subscription" element={<SubscriptionPage />} />
                      
                      {/* Authentication routes */}
                      <Route 
                        path="/auth/login" 
                        element={
                          <NoAuthGuard>
                            <Authentication />
                          </NoAuthGuard>
                        } 
                      />
                      
                      <Route 
                        path="/auth/signup" 
                        element={
                          <NoAuthGuard>
                            <Authentication />
                          </NoAuthGuard>
                        } 
                      />

                      {/* Protected routes */}
                      <Route 
                        path="/auth/*" 
                        element={
                          <AuthGuard>
                            <div className="app-container patent-browser-app">
                              <Header isVisible={!isModalOpen} />
                              <main className="main-content">
                                <Routes>
                                  {/* Root path redirects to dashboard */}
                                  <Route path="" element={<Navigate to="dashboard" replace />} />
                                  
                                  {/* User Routes */}
                                  <Route path="dashboard" element={<DashboardSelector />} />
                                  <Route 
                                    path="settings" 
                                    element={
                                      <Settings 
                                        initialSidebarBehavior={sidebarBehavior}
                                        onSidebarBehaviorChange={handleSidebarBehaviorChange} 
                                      />
                                    } 
                                  />
                                  <Route path="patentSaver" element={<SavedPatentList />} />
                                  <Route path="update-profile" element={<UpdateProfile />} />
                                  <Route path="profile" element={<ProfilePage />} />
                                  <Route path="subscription" element={<SubscriptionPage />} />
                                  <Route path="patent-history" element={<PatentHistory />} />
                                  <Route path="payment-history" element={<PaymentHistory />} />
                                  
                                  {/* Admin Routes - Protected by AdminGuard */}
                                  <Route 
                                    path="admin" 
                                    element={
                                      <AdminGuard>
                                        <Navigate to="/auth/dashboard" replace />
                                      </AdminGuard>
                                    } 
                                  />
                                  <Route 
                                    path="admin/*" 
                                    element={
                                      <AdminGuard>
                                        <AdminDashboard />
                                      </AdminGuard>
                                    } 
                                  />
                                </Routes>
                              </main>
                            </div>
                          </AuthGuard>
                        } 
                      />

                      {/* Catch-all route - redirect to landing page */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Router>
                </ThemeProvider>
              </AdminProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--secondary-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
              },
            }}
          />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
