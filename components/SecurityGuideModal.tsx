import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';

export default function SecurityGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-12 z-50 max-w-4xl mx-auto shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-white pt-2 pb-6 border-b border-gray-100 z-10">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-4">
                <ShieldCheck className="w-10 h-10 text-purple-600" /> Security Guide
              </h2>
              <button onClick={onClose} className="p-4 bg-gray-100 rounded-full hover:bg-gray-200">
                <X className="w-8 h-8 text-gray-700" />
              </button>
            </div>

            <div className="space-y-10 text-lg text-gray-700 pb-12">
              <section>
                <h3 className="font-bold text-gray-900 text-2xl mb-6">How to Setup Biometric App Lock</h3>
                <ul className="space-y-5 list-decimal pl-8">
                  <li><strong>Ensure Device Setup:</strong> Before visiting the website, make sure fingerprint or facial recognition (Windows Hello, Apple TouchID/FaceID) is already set up in your computer or phone system settings.</li>
                  <li><strong>Log In and Find Security Settings:</strong> Log into the website using your username and password. Navigate to "Account Settings," "Security," or "Profile".</li>
                  <li><strong>Register Biometrics:</strong> Look for options like "Register Biometrics," "Set up Passkey," or "Enable Fingerprint/Face Login".</li>
                  <li><strong>Authenticate:</strong> Your browser will prompt you to scan your finger or face to confirm the registration, creating a secure cryptographic key pair.</li>
                  <li><strong>Test:</strong> Log out and log back in, selecting the option to use biometrics instead of a password.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-gray-900 text-2xl mb-6">Key Requirements</h3>
                <ul className="space-y-5 list-disc pl-8">
                  <li><strong>Browser Support:</strong> Use a modern browser (Chrome, Edge, Safari, Firefox) that supports WebAuthn.</li>
                  <li><strong>Hardware:</strong> A device with a biometric sensor (fingerprint scanner, front-facing camera).</li>
                  <li><strong>Site Support:</strong> The website must have implemented biometric authentication (often branded as Passkeys).</li>
                </ul>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
