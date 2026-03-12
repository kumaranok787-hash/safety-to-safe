/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from './components/BottomNavigation';
import Home from './pages/Home';
import Health from './pages/Health';
import Education from './pages/Education';
import WomenSafety from './pages/WomenSafety';
import Police from './pages/Police';
import Profile from './pages/Profile';
import SmartSearch from './pages/SmartSearch';
import ReportIncident from './pages/ReportIncident';
import SOSModal from './components/SOSModal';
import AppLock from './components/AppLock';
import FeedbackModal from './components/FeedbackModal';
import { useState, useEffect } from 'react';
import { WifiOff, User, Star, ShieldAlert } from 'lucide-react';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Top Navigation Bar for Desktop */}
      <header className="hidden md:block bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="w-full px-12 h-24 flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/20">
              <span className="text-white font-display font-black text-3xl italic tracking-tighter">S</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl tracking-tight text-gray-900 dark:text-white leading-none">EMERGENCY</span>
              <span className="font-display font-bold text-base tracking-[0.2em] text-red-600 dark:text-red-500 leading-none mt-1">PORTAL</span>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/profile')}
              className="hidden lg:flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 border border-gray-100 dark:border-gray-700"
            >
              <User className="w-6 h-6" />
              Profile
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-feedback'))}
              className="hidden lg:flex items-center gap-3 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 rounded-2xl font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-all active:scale-95 border border-yellow-100 dark:border-yellow-900/50"
            >
              <Star className="w-6 h-6 fill-yellow-500" />
              Feedback
            </button>
            <BottomNavigation onSOSClick={() => setIsSOSOpen(true)} currentPath={location.pathname} isDesktop />
          </nav>
        </div>
      </header>

      <main className="w-full relative min-h-screen flex flex-col">
        {isOffline && (
          <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 z-[9999]">
            <WifiOff className="w-4 h-4" />
            You are currently offline. Some features may be unavailable.
          </div>
        )}
        
        <div className="flex-1 pb-20 md:pb-0 md:py-0 px-0">
          <Routes>
            <Route path="/" element={<Home onSOSClick={() => setIsSOSOpen(true)} />} />
            <Route path="/health" element={<Health />} />
            <Route path="/education" element={<Education />} />
            <Route path="/women-safety" element={<WomenSafety />} />
            <Route path="/police" element={<Police />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/search" element={<SmartSearch />} />
            <Route path="/report" element={<ReportIncident />} />
          </Routes>
        </div>

        {/* Professional Website Footer */}
        <footer className="hidden md:block bg-white border-t border-gray-100 pt-24 pb-16 px-12">
          <div className="w-full max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
              <div className="col-span-1 md:col-span-1">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                    <span className="text-white font-display font-black text-3xl italic tracking-tighter">S</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black text-2xl tracking-tight text-gray-900 leading-none">EMERGENCY</span>
                    <span className="font-display font-bold text-base tracking-[0.2em] text-red-600 leading-none mt-1">PORTAL</span>
                  </div>
                </div>
                <p className="text-gray-500 text-lg leading-relaxed">
                  India's most trusted emergency response system. Providing instant assistance and real-time safety updates across the nation.
                </p>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 mb-8 uppercase tracking-wider text-sm">Services</h4>
                <ul className="space-y-5 text-base text-gray-500">
                  <li><button onClick={() => navigate('/health')} className="hover:text-red-600 transition-colors">Medical Emergency</button></li>
                  <li><button onClick={() => navigate('/police')} className="hover:text-red-600 transition-colors">Police & Safety</button></li>
                  <li><button onClick={() => navigate('/women-safety')} className="hover:text-red-600 transition-colors">Women Protection</button></li>
                  <li><button onClick={() => navigate('/education')} className="hover:text-red-600 transition-colors">Education Support</button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-8 uppercase tracking-wider text-sm">Resources</h4>
                <ul className="space-y-5 text-base text-gray-500">
                  <li><button onClick={() => navigate('/search')} className="hover:text-red-600 transition-colors">Smart Search</button></li>
                  <li><button onClick={() => navigate('/profile')} className="hover:text-red-600 transition-colors">My Profile</button></li>
                  <li><a href="#" className="hover:text-red-600 transition-colors">Safety Guidelines</a></li>
                  <li><a href="#" className="hover:text-red-600 transition-colors">Disaster Protocols</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-8 uppercase tracking-wider text-sm">Emergency Dials</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">National Helpline</span>
                    <span className="text-3xl font-black text-red-600">112</span>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">Police Response</span>
                    <span className="text-3xl font-black text-blue-600">100</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-gray-400 text-sm">
                © 2026 Emergency Portal India. All rights reserved.
              </p>
              <div className="flex gap-10 text-sm text-gray-400">
                <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden">
          <BottomNavigation onSOSClick={() => setIsSOSOpen(true)} currentPath={location.pathname} />
        </div>
        
        <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />
        <FeedbackModal />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <AppLock>
            <AppContent />
          </AppLock>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}
