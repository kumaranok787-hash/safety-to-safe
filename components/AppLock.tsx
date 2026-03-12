import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { authenticateBiometrics } from '../utils/biometrics';

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    // Check if we are in an iframe (preview environment)
    if (window.self !== window.top) {
      setIsSimulated(true);
    }

    const checkLockStatus = async () => {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        try {
          const profile = JSON.parse(saved);
          if (profile.settings?.appLockEnabled) {
            setIsLocked(true);
            handleUnlock();
          } else {
            setIsLocked(false);
          }
        } catch (e) {
          setIsLocked(false);
        }
      } else {
        setIsLocked(false);
      }
      setIsChecking(false);
    };
    checkLockStatus();
  }, []);

  const handleUnlock = async () => {
    setError(null);
    const result = await authenticateBiometrics();
    if (result.success) {
      setIsLocked(false);
    } else {
      setError(result.error || "Authentication failed. Please try again.");
    }
  };

  if (isChecking) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 w-full relative overflow-hidden items-center justify-center p-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-16 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center text-center w-full max-w-2xl"
        >
          <div className="w-24 h-24 bg-purple-100 rounded-3xl flex items-center justify-center mb-10">
            <ShieldCheck className="w-12 h-12 text-purple-600" />
          </div>
          
          <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tight">App Locked</h1>
          <p className="text-xl text-gray-500 mb-10 font-medium leading-relaxed">
            Please authenticate using your fingerprint or face to access the Emergency Portal.
          </p>

          {isSimulated && (
            <div className="mb-10 flex items-start gap-4 text-amber-700 bg-amber-50 px-6 py-4 rounded-2xl w-full text-sm text-left border border-amber-200">
              <Info className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Using simulated biometrics due to environment restrictions. Open in a new tab for real biometrics.
              </span>
            </div>
          )}

          <button
            onClick={handleUnlock}
            className="w-full bg-purple-600 text-white font-bold py-6 rounded-2xl shadow-xl shadow-purple-200 active:scale-95 transition-transform flex items-center justify-center gap-4 text-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Fingerprint className="w-8 h-8" />
            Unlock with Biometrics
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl w-full text-sm font-medium text-left"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
