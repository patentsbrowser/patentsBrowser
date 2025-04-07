import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider } from "./AuthContext";
import Header from "./Components/Header/Header";
import Sidebar from "./Components/Sidebar/Sidebar";
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
import ProfilePage from './Components/Profile/ProfilePage';
import { Provider } from 'react-redux';
import { store } from "./Redux/store";
import SavedPatentList from "./Components/SavedPatentList/savedPatentList";
import SessionHandler from "./Components/Authentication/SessionHandler";
import LandingPage from "./Components/LandingPage/LandingPage";
import Forum from "./Components/Forum/Forum";
import SubscriptionPage from "./Components/Subscription/SubscriptionPage";
// import { store } from './Redux/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  console.log('STAGE')
  // Get the sidebar behavior from localStorage
  const [sidebarBehavior, setSidebarBehavior] = useState<'auto' | 'manual'>(() => {
    const saved = localStorage.getItem('sidebarBehavior');
    return (saved === 'auto' || saved === 'manual') ? saved : 'auto';
  });

  // Handle sidebar behavior change
  const handleSidebarBehaviorChange = (behavior: 'auto' | 'manual') => {
    setSidebarBehavior(behavior);
  };

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
                      <div className="app-container">
                        <Header />
                        <Sidebar />
                        <main className="main-content">
                          <Routes>
                            <Route path="dashboard" element={<Dashboard />} />
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
        </AuthProvider>
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
  );
};

export default App;
