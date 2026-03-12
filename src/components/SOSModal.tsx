import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ShieldAlert, Flame, HeartPulse, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

const emergencies = [
  { name: 'Police', number: '100', icon: ShieldAlert, color: 'bg-blue-600' },
  { name: 'Ambulance', number: '102', icon: HeartPulse, color: 'bg-green-600' },
  { name: 'Fire', number: '101', icon: Flame, color: 'bg-orange-600' },
  { name: 'Women Helpline', number: '1090', icon: Phone, color: 'bg-pink-600' },
  { name: 'National Emergency', number: '112', icon: Phone, color: 'bg-red-600' },
];

export default function SOSModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [countdown, setCountdown] = useState(5);
  const [isCanceled, setIsCanceled] = useState(false);
  const [savedContacts, setSavedContacts] = useState<{name: string, phone: string}[]>([]);

  const handleEmergencyCall = (phone: string) => {
    onClose();
    const saved = localStorage.getItem('userProfile');
    const profile = saved ? JSON.parse(saved) : null;
    const autoShare = profile?.settings?.autoLocationSharing ?? true;
    const method = profile?.settings?.sharingMethod ?? 'SMS';
    const primaryContactIndex = profile?.settings?.primaryContactIndex ?? 0;
    
    let contactPhone = '';
    if (profile?.contacts && profile.contacts.length > primaryContactIndex) {
      contactPhone = profile.contacts[primaryContactIndex].phone;
    }

    if (autoShare && navigator.geolocation && contactPhone) {
      // Vibrate the sender's device to confirm SOS is triggered (if supported)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 500]);
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const message = `🚨 URGENT SOS! 🚨 I need immediate help! My current live location: https://maps.google.com/?q=${latitude},${longitude} Please check immediately!`;
          
          if (method === 'WhatsApp') {
            // Remove non-numeric characters for WhatsApp link
            const waPhone = contactPhone.replace(/\D/g, '');
            window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
            setTimeout(() => {
              window.location.href = `tel:${phone}`;
            }, 1000);
          } else if (navigator.share) {
            navigator.share({
              title: 'Emergency Location',
              text: message,
            }).then(() => {
              window.location.href = `tel:${phone}`;
            }).catch(() => {
              window.location.href = `sms:${contactPhone}?body=${encodeURIComponent(message)}`;
              setTimeout(() => {
                window.location.href = `tel:${phone}`;
              }, 1000);
            });
          } else {
            window.location.href = `sms:${contactPhone}?body=${encodeURIComponent(message)}`;
            setTimeout(() => {
              window.location.href = `tel:${phone}`;
            }, 1000);
          }
        },
        () => {
          window.location.href = `tel:${phone}`;
        }
      );
    } else {
      window.location.href = `tel:${phone}`;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const profile = JSON.parse(saved);
      if (profile.contacts && profile.contacts.length > 0) {
        setSavedContacts(profile.contacts.filter((c: any) => c.name && c.phone));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && !isCanceled && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (isOpen && !isCanceled && countdown === 0) {
      handleEmergencyCall('112');
      setIsCanceled(true); // Stop further triggers
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown, isCanceled]);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setIsCanceled(false);
    }
  }, [isOpen]);

  const handleCancel = () => {
    setIsCanceled(true);
  };

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
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-12 z-50 max-w-4xl mx-auto shadow-2xl"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-bold text-red-600 flex items-center gap-4">
                <span className="animate-pulse">🚨</span> Emergency Services
              </h2>
              <button onClick={onClose} aria-label="Close emergency modal" className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none">
                <X className="w-8 h-8 text-gray-700" />
              </button>
            </div>

            {!isCanceled ? (
              <div className="bg-red-50 border border-red-200 rounded-[2rem] p-10 text-center mb-10">
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4 animate-pulse" />
                <h3 className="text-3xl font-bold text-red-800 mb-2">Calling National Emergency (112)</h3>
                <p className="text-xl text-red-600 mb-8">in <span className="text-5xl font-black">{countdown}</span> seconds</p>
                <button 
                  onClick={handleCancel}
                  className="bg-white text-red-700 border-2 border-red-200 font-bold py-5 px-12 rounded-2xl shadow-sm active:scale-95 transition-transform w-full text-xl"
                >
                  Cancel Auto-Call
                </button>
              </div>
            ) : (
              <div className="mb-8 text-center text-lg font-medium text-gray-500">
                Auto-call canceled. Select a service below.
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pb-8 scrollbar-hide">
              {savedContacts.length > 0 && (
                <div className="col-span-1 md:col-span-2 mb-4">
                  <h4 className="text-lg font-bold text-gray-800 mb-4 px-1">Emergency Contacts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedContacts.map((contact, idx) => (
                      <motion.button
                        key={`contact-${idx}`}
                        onClick={() => handleEmergencyCall(contact.phone)}
                        whileHover="hover"
                        aria-label={`Call ${contact.name} at ${contact.phone}`}
                        className="w-full flex items-center justify-between p-6 rounded-2xl text-white bg-gray-800 active:scale-95 transition-transform focus:ring-4 focus:ring-offset-2 focus:ring-gray-500 focus:outline-none"
                      >
                        <div className="flex items-center gap-6 text-left">
                          <motion.div 
                            variants={{ hover: { y: -5 } }} 
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Phone className="w-10 h-10" />
                          </motion.div>
                          <div>
                            <span className="font-bold text-2xl block leading-tight">{contact.name}</span>
                            <span className="text-lg opacity-90 font-medium">{contact.phone}</span>
                          </div>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full">
                          <Phone className="w-6 h-6" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="col-span-1 md:col-span-2 text-lg font-bold text-gray-800 mb-2 px-1 mt-4">Emergency Services</h4>
              {emergencies.map((em) => (
                <motion.button
                  key={em.name}
                  onClick={() => handleEmergencyCall(em.number)}
                  whileHover="hover"
                  aria-label={`Call ${em.name} at ${em.number}`}
                  className={`w-full flex items-center justify-between p-6 rounded-2xl text-white ${em.color} active:scale-95 transition-transform focus:ring-4 focus:ring-offset-2 focus:ring-${em.color.split('-')[1]}-500 focus:outline-none`}
                >
                  <div className="flex items-center gap-6 text-left">
                    <motion.div 
                      variants={{ hover: { y: -5 } }} 
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <em.icon className="w-10 h-10" />
                    </motion.div>
                    <div>
                      <div className="font-bold text-2xl">{em.name}</div>
                      <div className="text-white/80 text-lg">Tap to dial {em.number}</div>
                    </div>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                    <Phone className="w-8 h-8" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
