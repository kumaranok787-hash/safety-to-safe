import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Camera, Send, AlertTriangle, Shield, Clock, Info, CheckCircle2, Flame, HeartPulse, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const ReportIncident = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    urgency: 'medium',
    anonymous: false
  });

  const fetchLocation = () => {
    setLocation(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: { 'User-Agent': 'EmergencyPortal/1.0' }
            });
            const data = await res.json();
            setLocation({
              lat: latitude,
              lng: longitude,
              address: data.display_name || 'Current Location'
            });
          } catch (e) {
            setLocation({ lat: latitude, lng: longitude, address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocation({ lat: 0, lng: 0, address: 'Unable to fetch location. Please enable GPS.' });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocation({ lat: 0, lng: 0, address: 'Geolocation not supported by your browser.' });
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setStep(3);
  };

  const incidentTypes = [
    { id: 'accident', label: 'Road Accident', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-100', selectedClass: 'border-amber-600 bg-amber-50' },
    { id: 'crime', label: 'Crime / Theft', icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-100', selectedClass: 'border-blue-600 bg-blue-50' },
    { id: 'medical', label: 'Medical Emergency', icon: HeartPulse, color: 'text-rose-600 bg-rose-50 border-rose-100', selectedClass: 'border-rose-600 bg-rose-50' },
    { id: 'fire', label: 'Fire Outbreak', icon: Flame, color: 'text-orange-600 bg-orange-50 border-orange-100', selectedClass: 'border-orange-600 bg-orange-50' },
    { id: 'other', label: 'Other Incident', icon: AlertCircle, color: 'text-slate-600 bg-slate-50 border-slate-100', selectedClass: 'border-slate-600 bg-slate-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 pt-12 pb-8 px-6 transition-colors duration-200">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">Report Incident</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Help authorities respond faster by providing real-time details.</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-8">
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">What type of incident?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {incidentTypes.map((type) => {
                  const isSelected = formData.type === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setFormData({ ...formData, type: type.id });
                        setStep(2);
                      }}
                      className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all active:scale-95 text-left ${
                        isSelected ? type.selectedClass : 'border-gray-50 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl border ${type.color}`}>
                        <type.icon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 transition-colors duration-200">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Incident Details</h2>
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Change Type
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Location Display */}
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Live Location</p>
                        <p className="text-gray-700 dark:text-gray-300 font-medium mt-1">{location ? location.address : 'Detecting live location...'}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={fetchLocation}
                      className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      title="Refresh Location"
                    >
                      <RefreshCw className={`w-5 h-5 ${!location ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what is happening..."
                      className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-50 dark:border-gray-800 rounded-3xl p-6 min-h-[150px] outline-none focus:border-red-600 dark:focus:border-red-500 text-gray-900 dark:text-white transition-all font-medium"
                    />
                  </div>

                  {/* Urgency */}
                  <div>
                    <label className="block text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 ml-2">Urgency Level</label>
                    <div className="flex gap-3">
                      {['low', 'medium', 'high'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setFormData({ ...formData, urgency: level })}
                          className={`flex-1 py-4 rounded-2xl font-bold capitalize transition-all ${
                            formData.urgency === level 
                              ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' 
                              : 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anonymous Toggle */}
                  <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Report Anonymously</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your identity will be hidden from public records.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, anonymous: !formData.anonymous })}
                      className={`w-14 h-8 rounded-full p-1 transition-all ${formData.anonymous ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.anonymous ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 py-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-3xl font-black text-xl shadow-xl dark:shadow-none hover:shadow-2xl transition-all active:scale-95 border border-gray-100 dark:border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-6 bg-red-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-red-200 dark:shadow-none hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-4xl font-display font-black text-gray-900 dark:text-white mb-4">Report Submitted</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium mb-12 max-w-md mx-auto">
              Authorities have been notified. Please stay safe and follow any instructions provided by emergency responders.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-12 py-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-black text-xl shadow-2xl shadow-gray-200 dark:shadow-none hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95"
            >
              Back to Home
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReportIncident;
