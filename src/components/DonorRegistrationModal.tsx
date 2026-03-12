import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, User, Phone, MapPin, CheckCircle2, Loader2, Send } from 'lucide-react';

interface DonorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DonorRegistrationModal({ isOpen, onClose }: DonorRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    bloodGroup: '',
    phone: '',
    city: '',
    lastDonation: '',
    isAvailable: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bloodGroup || !formData.phone) return;

    setIsSubmitting(true);
    // Simulate API registration
    setTimeout(() => {
      const donors = JSON.parse(localStorage.getItem('emergency_donors') || '[]');
      donors.push({
        ...formData,
        id: Date.now(),
        registeredAt: new Date().toISOString()
      });
      localStorage.setItem('emergency_donors', JSON.stringify(donors));

      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setFormData({
          name: '',
          bloodGroup: '',
          phone: '',
          city: '',
          lastDonation: '',
          isAvailable: true
        });
      }, 3000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="bg-white rounded-[3.5rem] w-full max-w-2xl flex flex-col overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-gray-100"
          >
            {/* Header */}
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-red-50/30">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-red-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-red-200">
                  <Heart className="w-8 h-8 fill-current" />
                </div>
                <div>
                  <h3 className="font-black text-4xl text-gray-900 tracking-tight">Become a Hero</h3>
                  <p className="text-lg text-gray-500 font-bold uppercase tracking-widest mt-1">Donor Registration</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-4 bg-gray-100 rounded-full hover:bg-gray-200 transition-all active:scale-95"
              >
                <X className="w-8 h-8 text-gray-800" />
              </button>
            </div>

            <div className="p-10">
              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-10 shadow-inner">
                    <CheckCircle2 className="w-16 h-16" />
                  </div>
                  <h4 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">Success!</h4>
                  <p className="text-2xl text-gray-500 font-medium leading-relaxed max-w-md">
                    You are now part of our life-saving donor network. Thank you for your generosity!
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="e.g. Rahul Sharma" 
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 pl-16 pr-8 text-2xl focus:outline-none focus:border-red-500 transition-all shadow-inner" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Blood Group</label>
                      <select 
                        required
                        value={formData.bloodGroup}
                        onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 transition-all shadow-inner font-black appearance-none"
                      >
                        <option value="">Select...</option>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                        <input 
                          type="tel" 
                          required
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="+91 00000 00000" 
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 pl-16 pr-8 text-2xl focus:outline-none focus:border-red-500 transition-all shadow-inner" 
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Current City</label>
                      <div className="relative">
                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={formData.city}
                          onChange={e => setFormData({...formData, city: e.target.value})}
                          placeholder="e.g. Mumbai" 
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 pl-16 pr-8 text-2xl focus:outline-none focus:border-red-500 transition-all shadow-inner" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Last Donation Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formData.lastDonation}
                      onChange={e => setFormData({...formData, lastDonation: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 transition-all shadow-inner" 
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white font-black py-10 rounded-[2.5rem] shadow-[0_24px_48px_-8px_rgba(220,38,38,0.4)] active:scale-95 transition-all text-4xl hover:bg-red-700 flex items-center justify-center gap-6 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-10 h-10 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-10 h-10" />
                        Register Now
                      </>
                    )}
                  </button>
                  <p className="text-center text-gray-400 text-lg font-bold">
                    Join 5,000+ donors making a difference.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
