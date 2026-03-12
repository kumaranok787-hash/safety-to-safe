import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ShieldAlert, HeartPulse, Flame, AlertCircle, Activity, Info, MapPin, Bell, X, Loader2, AlertTriangle, User, Star, Locate, Sparkles, Fingerprint } from 'lucide-react';
import Markdown from 'react-markdown';
import { getSearchGroundedContent, getNearbyPlaces } from '../services/geminiService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useLanguage } from '../contexts/LanguageContext';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Home({ onSOSClick }: { onSOSClick: () => void }) {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [modalState, setModalState] = useState<{isOpen: boolean, title: string, content: string, loading: boolean}>({
    isOpen: false, title: '', content: '', loading: false
  });

  const [liveLocation, setLiveLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapCategory, setMapCategory] = useState('Hospitals');
  const [locationError, setLocationError] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [savedContacts, setSavedContacts] = useState<{name: string, phone: string}[]>([]);
  const [feedbackModal, setFeedbackModal] = useState<{isOpen: boolean, serviceName: string}>({isOpen: false, serviceName: ''});
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = () => {
    if (rating === 0) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackModal({isOpen: false, serviceName: ''});
      setFeedbackSubmitted(false);
      setRating(0);
      setFeedbackText('');
    }, 2000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const profile = JSON.parse(saved);
      if (profile.contacts && profile.contacts.length > 0) {
        setSavedContacts(profile.contacts.filter((c: any) => c.name && c.phone));
      }
    }
  }, []);

  useEffect(() => {
    const defaultLocation = { lat: 28.6139, lng: 77.2090 }; // New Delhi fallback

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLiveLocation(loc);
          setSearchLocation(prev => prev ? prev : loc);
          setLocationError('');
        },
        (err) => {
          console.warn("Geolocation error:", err.message || err);
          setLocationError('Location access denied or timed out. Showing default map.');
          setSearchLocation(prev => prev ? prev : defaultLocation);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );

      // Fallback timeout in case watchPosition hangs silently (common in iframes)
      const fallbackTimer = setTimeout(() => {
        setSearchLocation(prev => {
          if (!prev) {
            setLocationError('Location request timed out. Showing default map.');
            return defaultLocation;
          }
          return prev;
        });
      }, 12000);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(fallbackTimer);
      };
    } else {
      setLocationError('Geolocation not supported.');
      setSearchLocation(defaultLocation);
    }
  }, []);

  const handleEmergencyCall = (phone: string) => {
    const saved = localStorage.getItem('userProfile');
    const profile = saved ? JSON.parse(saved) : null;
    const autoShare = profile?.settings?.autoLocationSharing ?? true;
    const method = profile?.settings?.sharingMethod ?? 'SMS';

    if (autoShare && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const message = `I need help! My current location: https://maps.google.com/?q=${latitude},${longitude}`;
          
          if (method === 'WhatsApp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
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
              window.location.href = `sms:?body=${encodeURIComponent(message)}`;
              setTimeout(() => {
                window.location.href = `tel:${phone}`;
              }, 1000);
            });
          } else {
            window.location.href = `sms:?body=${encodeURIComponent(message)}`;
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

  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const handleRecenter = () => {
    if (liveLocation) {
      setSearchLocation(liveLocation);
    } else if (navigator.geolocation) {
      setIsMapLoading(true);
      setLocationError('');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLiveLocation(loc);
          setSearchLocation(loc);
          setIsMapLoading(false);
        },
        (err) => {
          console.error(err);
          setLocationError('Failed to get current location.');
          setIsMapLoading(false);
        },
        { timeout: 10000 }
      );
    } else {
      setLocationError('Geolocation not supported by your browser.');
    }
  };

  useEffect(() => {
    if (!searchLocation) return;
    
    // If initial fetch is done, we only fetch if mapCategory changes
    // or if the user explicitly triggers it.
    // However, for Home map, we might want it to update when location changes significantly.
    // For now, let's just ensure it doesn't fire multiple times on mount.
    
    const fetchPlaces = async () => {
      if (isMapLoading) return;
      setIsMapLoading(true);
      try {
        const query = mapCategory;
        const data = await getNearbyPlaces(query, searchLocation.lat, searchLocation.lng);
        setPlaces(data.places || []);
        setIsInitialFetchDone(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsMapLoading(false);
      }
    };
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchPlaces();
    }, 800);
    return () => clearTimeout(timer);
  }, [searchLocation, mapCategory]);

  const handleActionClick = async (label: string) => {
    if (label === 'Find Hospital' || label === 'Find Nearest Hospital') navigate('/health', { state: { tab: 'Hospitals' } });
    else if (label === 'Blood Bank') navigate('/health', { state: { tab: 'Blood Bank' } });
    else if (label === 'Report Incident') navigate('/report');
    else if (label === 'Report Crime') navigate('/police', { state: { tab: 'File FIR' } });
    else if (label === 'Gov Schemes') navigate('/health', { state: { tab: 'Schemes' } });
    else if (label === 'Missing Person') navigate('/police', { state: { tab: 'File FIR' } });
    else if (label === 'Police & Safety') navigate('/police');
    else if (label === 'Live Updates') {
      if (modalState.loading) return;
      if (!navigator.onLine) {
        setModalState({ isOpen: true, title: 'Live Updates', content: 'You are currently offline. Live updates require an internet connection.', loading: false });
        return;
      }
      setModalState({ isOpen: true, title: 'Live Updates', content: '', loading: true });
      try {
        const text = await getSearchGroundedContent('Latest emergency news, public safety updates, and alerts in India today.');
        setModalState({ isOpen: true, title: 'Live Updates', content: text, loading: false });
      } catch (e) {
        setModalState({ isOpen: true, title: 'Live Updates', content: 'Failed to fetch updates.', loading: false });
      }
    }
    else if (label === 'Disaster Info') {
      if (modalState.loading) return;
      if (!navigator.onLine) {
        setModalState({ isOpen: true, title: 'Disaster Info', content: 'You are currently offline. Disaster info requires an internet connection.\n\n**Basic Safety Guidelines:**\n- **Earthquake:** Drop, Cover, and Hold On.\n- **Fire:** Evacuate immediately, use stairs, call 101.\n- **Flood:** Move to higher ground, avoid walking or driving through floodwaters.', loading: false });
        return;
      }
      setModalState({ isOpen: true, title: 'Disaster Info', content: '', loading: true });
      try {
        const text = await getSearchGroundedContent('Current active natural disasters, earthquakes, or severe weather warnings in India right now.');
        setModalState({ isOpen: true, title: 'Disaster Info', content: text, loading: false });
      } catch (e) {
        setModalState({ isOpen: true, title: 'Disaster Info', content: 'Failed to fetch disaster info.', loading: false });
      }
    }
    else if (label === 'Safe Places') {
      if (!navigator.onLine) {
        setModalState({ isOpen: true, title: 'Nearby Safe Places', content: 'You are currently offline. Finding safe places requires an internet connection.', loading: false });
        return;
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          window.open(`https://www.google.com/maps/search/Police+Stations+Hospitals+Shelters/@${pos.coords.latitude},${pos.coords.longitude},14z`, '_blank');
        }, () => {
          setModalState({ isOpen: true, title: 'Nearby Safe Places', content: 'Location permission denied. Cannot find nearby safe places.', loading: false });
        });
      } else {
        setModalState({ isOpen: true, title: 'Nearby Safe Places', content: 'Geolocation not supported.', loading: false });
      }
    }
  };
  const quickDials = [
    { num: '112', label: 'National', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' },
    { num: '100', label: 'Police', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' },
    { num: '102', label: 'Ambulance', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' },
    { num: '101', label: 'Fire', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50' },
    { num: '1090', label: 'Women', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800/50' },
  ];

  const secondaryActions = [
    { icon: AlertTriangle, label: 'Report Incident', color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400', path: '/report' },
    { icon: AlertCircle, label: 'Disaster Info', color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
    { icon: MapPin, label: 'Safe Places', color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
    { icon: Activity, label: 'Blood Bank', color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
    { icon: Info, label: 'Gov Schemes', color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    { icon: Bell, label: 'Live Updates', color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  ];

  return (
    <div className="min-h-full bg-[#fcfcfc] dark:bg-gray-950 pb-0 font-sans">
      {/* Modern Website Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 min-h-[90vh] flex items-center">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1582213726892-2588df2466dd?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-gray-900 via-white/90 dark:via-gray-900/90 to-transparent" />
          
          {/* Modern Dot Grid */}
          <div className="absolute inset-0 dark:opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(239,68,68,0.05) 1px, transparent 0)', backgroundSize: '48px 48px' }} />

          {/* Radar Sweep Animation */}
          <div className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-red-500/5 flex items-center justify-center hidden md:flex">
            <div className="w-[600px] h-[600px] rounded-full border border-red-500/5 flex items-center justify-center">
              <div className="w-[400px] h-[400px] rounded-full border border-red-500/5" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0 340deg, rgba(239, 68, 68, 0.05) 360deg)'
              }}
            />
          </div>

          {/* Floating Connection Nodes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-red-500 rounded-full hidden md:block"
              initial={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                opacity: 0
              }}
              animate={{ 
                top: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                left: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                opacity: [0, 0.4, 0]
              }}
              transition={{ 
                duration: 15 + Math.random() * 10, 
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50" />
            </motion.div>
          ))}

          {/* Animated Safety Circles */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 -left-20 w-[40rem] h-[40rem] bg-red-100 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 -right-20 w-[40rem] h-[40rem] bg-blue-100 rounded-full blur-[100px]"
          />
        </div>
        
        <div className="w-full px-12 py-24 relative z-10">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-20">
            {/* Left Side: Content */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 text-center lg:text-left"
            >
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-black uppercase tracking-[0.3em] mb-10 shadow-sm"
              >
                <ShieldAlert className="w-5 h-5" />
                {t('emergency_portal') || 'Emergency Portal'}
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-gray-900 dark:text-white leading-[0.9] tracking-tighter mb-12">
                {t('home_title') || 'STAY SAFE.'}<br/>
                <span className="text-red-600 dark:text-red-500 italic">{t('home_subtitle') || 'BE PREPARED.'}</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 max-w-2xl mb-16 font-medium leading-relaxed">
                Your comprehensive safety companion. Instant SOS alerts, real-time emergency updates, and quick access to essential services across India.
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
                <button 
                  onClick={() => navigate('/search')}
                  className="px-12 py-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-3xl font-black text-xl flex items-center gap-4 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-2xl shadow-gray-200 dark:shadow-none active:scale-95 group"
                >
                  <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                  Smart Search
                </button>
                <div className="flex items-center gap-4">
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="bg-white dark:bg-gray-800 text-xl font-black text-gray-700 dark:text-gray-200 rounded-2xl px-8 py-6 outline-none border border-gray-200 dark:border-gray-700 focus:ring-4 focus:ring-red-500/20 transition-all cursor-pointer shadow-lg dark:shadow-none"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">हिन्दी (HI)</option>
                    <option value="te">తెలుగు (TE)</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Right Side: Visual/SOS */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex-shrink-0"
            >
              <div className="relative w-64 h-64 md:w-96 md:h-96">
                {/* Pulsing Background Rings */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 bg-red-500 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0, 0.1] }}
                  transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                  className="absolute inset-0 bg-red-400 rounded-full blur-[100px]"
                />
                
                <button
                  onClick={onSOSClick}
                  className="relative w-full h-full bg-gradient-to-br from-red-600 to-red-800 rounded-full shadow-[0_40px_100px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-white border-[12px] border-white active:scale-95 transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <AlertCircle className="w-16 h-16 md:w-24 md:h-24 mb-4" />
                  </motion.div>
                  <span className="text-6xl md:text-8xl font-display font-black tracking-tighter italic leading-none">SOS</span>
                  <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] mt-4 opacity-90">Press for Help</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Quick Dials Integrated into Hero */}
          <div className="mt-24 pt-12 border-t border-gray-100/50 dark:border-gray-800/50">
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-center lg:justify-start gap-8">
              <span className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mr-6">Quick Dial:</span>
              {quickDials.map((dial) => (
                <button
                  key={dial.num}
                  onClick={() => handleEmergencyCall(dial.num)}
                  className={`flex items-center gap-6 px-10 py-6 rounded-[2rem] border bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl dark:shadow-none transition-all active:scale-95 group ${dial.color}`}
                >
                  <Phone className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <span className="font-black text-3xl dark:text-white">{dial.num}</span>
                  <span className="text-xs font-black uppercase tracking-widest opacity-60 dark:text-gray-300">{dial.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-12">
        <div className="max-w-[1600px] mx-auto">
          {/* Stats Section - Professional Trust Elements */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="text-center">
              <div className="text-6xl font-display font-black text-gray-900 dark:text-white mb-2">10M+</div>
              <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Users Protected</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black text-red-600 dark:text-red-500 mb-2">24/7</div>
              <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Support</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black text-gray-900 dark:text-white mb-2">100%</div>
              <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Secure Sync</div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-display font-black text-blue-600 dark:text-blue-500 mb-2">500+</div>
              <div className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Cities Covered</div>
            </div>
          </div>

        {/* Red Alert Banner - Refined */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-red-600 dark:bg-red-700 rounded-[3rem] p-10 text-white shadow-2xl shadow-red-100 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-10"
        >
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md">
              <Flame className="w-12 h-12" />
            </div>
            <div>
              <h3 className="font-display font-bold text-3xl">Disaster Safety Tips</h3>
              <p className="text-lg text-white/80 mt-2 max-w-xl">During an earthquake, Drop, Cover, and Hold On. Stay away from glass and windows.</p>
            </div>
          </div>
          <button 
            onClick={() => handleActionClick('Disaster Info')}
            className="px-10 py-5 bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 font-bold text-lg rounded-2xl hover:bg-red-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Learn More
          </button>
        </motion.div>

        {/* Quick Actions Grid - Refined */}
        <div className="mt-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h3 className="text-4xl font-display font-bold text-gray-900 dark:text-white">Quick Actions</h3>
              <p className="text-lg text-gray-500 dark:text-gray-400">Essential services at your fingertips</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Primary Actions Styled as Large Cards */}
            <button 
              onClick={() => handleActionClick('Find Nearest Hospital')}
              className="col-span-2 md:col-span-2 lg:col-span-2 group relative overflow-hidden bg-white dark:bg-gray-800 p-12 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl dark:shadow-none transition-all active:scale-95 text-left"
            >
              <div className="bg-green-50 dark:bg-green-900/30 w-20 h-20 rounded-3xl flex items-center justify-center text-green-600 dark:text-green-400 mb-8 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-12 h-12" />
              </div>
              <h4 className="font-display font-bold text-3xl text-gray-900 dark:text-white">Nearest Hospital</h4>
              <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 font-medium">Get instant directions to the closest medical facility with real-time availability.</p>
              <div className="mt-8 inline-flex items-center gap-3 text-green-600 dark:text-green-400 font-bold text-lg">
                Find Help Now
                <Activity className="w-6 h-6" />
              </div>
            </button>

            <button 
              onClick={() => handleActionClick('Police & Safety')}
              className="col-span-2 md:col-span-1 lg:col-span-2 group relative overflow-hidden bg-blue-600 dark:bg-blue-700 p-12 rounded-[3rem] shadow-xl shadow-blue-100 dark:shadow-none hover:shadow-2xl transition-all active:scale-95 text-left text-white"
            >
              <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <h4 className="font-display font-bold text-3xl">Police Response</h4>
              <p className="text-lg text-white/80 mt-4 font-medium">Connect with local law enforcement and report incidents securely.</p>
              <div className="mt-8 inline-flex items-center gap-3 text-white font-bold text-lg">
                Contact Police
                <ShieldAlert className="w-6 h-6" />
              </div>
            </button>

            <div className="col-span-2 lg:col-span-2 grid grid-cols-2 gap-6">
              {secondaryActions.map((action, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleActionClick(action.label)}
                  className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg dark:shadow-none transition-all active:scale-95 group"
                >
                  <div className={`p-6 rounded-3xl ${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Features Section - Professional SaaS Style */}
        <div className="mt-32 mb-32">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-6xl font-display font-bold text-gray-900 dark:text-white mb-6">Advanced Safety Features</h3>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">Our platform leverages cutting-edge technology to provide you with the most reliable emergency response tools available today.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                <Locate className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Real-time Tracking</h4>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">Precision GPS tracking ensures that help can find you even in the most remote or crowded locations.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Instant SOS</h4>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">One-tap emergency trigger that notifies your contacts and local authorities with your exact coordinates.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                <Fingerprint className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Secure Data</h4>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">Your personal and medical information is encrypted and stored securely, accessible only when you need it.</p>
            </div>
          </div>
        </div>

        {/* Women's Safety Section - Refined */}
        <div className="mt-24">
          <div className="bg-gradient-to-br from-pink-500 via-rose-600 to-rose-700 dark:from-pink-700 dark:via-rose-800 dark:to-rose-900 rounded-[4rem] p-12 md:p-20 text-white shadow-2xl shadow-pink-100 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-20">
              <div className="max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-wider mb-8">
                  <ShieldAlert className="w-4 h-4" />
                  Priority Protection
                </div>
                <h3 className="text-4xl md:text-6xl font-display font-bold mb-6">Women & Child Safety</h3>
                <p className="text-white/80 text-xl md:text-2xl font-medium leading-relaxed mb-12">
                  Dedicated support systems and silent alert features designed to ensure safety and provide immediate assistance when needed most.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                  <button 
                    onClick={() => navigate('/women-safety')}
                    className="px-10 py-5 bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 rounded-2xl font-bold text-lg shadow-lg hover:bg-rose-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                  >
                    Access Safety Tools
                  </button>
                  <button 
                    onClick={() => {
                      setModalState({
                        isOpen: true,
                        title: "Women's Safety Tips",
                        content: `### Essential Safety Tips for Women
1. **Stay Aware:** Always be conscious of your surroundings. Avoid distractions like heavy phone use in isolated areas.
2. **Share Location:** Use the "Live Location" feature in messaging apps when traveling alone.
3. **Trust Your Instincts:** If a situation feels wrong, leave immediately. Don't worry about being "polite."
4. **Keep Emergency Contacts Ready:** Ensure your speed dials are set up.
5. **Public Transport Safety:** Sit near the driver or in crowded compartments.
6. **Self-Defense:** Consider carrying a legal self-defense tool like pepper spray where permitted.`,
                        loading: false
                      });
                    }}
                    className="px-10 py-5 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl font-bold text-lg hover:bg-white/30 transition-all active:scale-95"
                  >
                    Safety Guidelines
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full lg:w-auto">
                <button 
                  onClick={() => {
                    const saved = localStorage.getItem('userProfile');
                    if (saved) {
                      const profile = JSON.parse(saved);
                      const contacts = profile.contacts?.filter((c: any) => c.phone) || [];
                      if (contacts.length > 0) {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            const msg = `SILENT ALERT: I am in danger. My location: https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
                            window.location.href = `sms:${contacts[0].phone}?body=${encodeURIComponent(msg)}`;
                          });
                        }
                      } else {
                        alert("Please add emergency contacts in your profile first.");
                      }
                    }
                  }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-[3rem] flex flex-col items-center gap-6 hover:bg-white/20 transition-all active:scale-95"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center">
                    <Bell className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-2xl">Silent Panic</span>
                    <span className="text-sm text-white/60">Discreet alert to contacts</span>
                  </div>
                </button>
                <button 
                  onClick={() => handleEmergencyCall('1090')}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-[3rem] flex flex-col items-center gap-6 hover:bg-white/20 transition-all active:scale-95"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center">
                    <Phone className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-2xl">Helpline 1090</span>
                    <span className="text-sm text-white/60">Direct police assistance</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contacts - Refined */}
        {savedContacts.length > 0 && (
          <div className="mt-24">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Emergency Contacts</h3>
                <p className="text-lg text-gray-500 dark:text-gray-400">Your trusted circle for immediate alerts</p>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                className="text-lg font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Manage Contacts
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedContacts.map((contact, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between p-8 bg-white dark:bg-gray-800 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl dark:shadow-none transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <User className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-gray-900 dark:text-white text-2xl">{contact.name}</h4>
                      <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEmergencyCall(contact.phone)}
                      className="w-16 h-16 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors active:scale-90"
                    >
                      <Phone className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Services Map - Refined */}
        <div className="mt-24 mb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-10">
            <div>
              <h3 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Find Nearby Services</h3>
              <p className="text-lg text-gray-500 dark:text-gray-400">Locate essential facilities in your current area</p>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {['Hospitals', 'Police Stations', 'Blood Banks', 'Safe Places', 'Schools', 'Colleges', 'Hotels'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setMapCategory(cat)}
                  className={`flex-shrink-0 px-8 py-4 rounded-2xl text-sm font-bold transition-all ${
                    mapCategory === cat 
                      ? 'bg-red-600 text-white shadow-xl shadow-red-100 dark:shadow-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-[4rem] shadow-2xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden h-[700px] relative z-10">
            {!navigator.onLine ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 z-10 p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Map Unavailable</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please connect to the internet to view nearby services on the map.</p>
              </div>
            ) : !searchLocation && !locationError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-red-700 dark:text-red-500 mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Getting your location...</p>
              </div>
            ) : null}
            {navigator.onLine && searchLocation && (
              <div className="relative h-full w-full">
                {isMapLoading && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Updating map...</span>
                  </div>
                )}
                <MapContainer center={[searchLocation.lat, searchLocation.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  />
                  <MapUpdater center={[searchLocation.lat, searchLocation.lng]} />
                  
                  {liveLocation && (
                    <Marker position={[liveLocation.lat, liveLocation.lng]} icon={userIcon}>
                      <Popup>
                        <strong>You are here</strong>
                      </Popup>
                    </Marker>
                  )}

                  <MarkerClusterGroup chunkedLoading>
                    {places.map((place, idx) => (
                      <Marker key={idx} position={[parseFloat(place.lat), parseFloat(place.lng)]} icon={customIcon}>
                        <Popup>
                          <div className="text-sm">
                            <strong className="block mb-1">{place.title}</strong>
                            <span className="text-xs text-gray-600 block mb-2">{place.address}</span>
                            <div className="flex gap-2 mt-2">
                              <a 
                                href={place.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-block"
                              >
                                Get Directions
                              </a>
                              <button
                                onClick={() => setFeedbackModal({isOpen: true, serviceName: place.title})}
                                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                              >
                                <Star className="w-3 h-3" /> Rate
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                </MapContainer>
                <button 
                  onClick={handleRecenter}
                  aria-label="Re-center map on current location"
                  className="absolute bottom-4 right-4 z-[400] bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 active:scale-90 transition-transform hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Locate className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
          {locationError && (
            <div className="mt-2 px-1">
              <p className="text-[10px] text-red-500">{locationError}</p>
              {locationError.includes('denied') || locationError.includes('timed out') ? (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <strong>Tip:</strong> If you are viewing this in a preview window, try opening the app in a new tab to grant location permissions.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Action Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-3xl text-gray-900 dark:text-white">{modalState.title}</h3>
                <button onClick={() => setModalState({ ...modalState, isOpen: false })} aria-label="Close modal" className="p-3 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <X className="w-8 h-8 text-gray-800 dark:text-gray-200" />
                </button>
              </div>
              <div className="p-10 overflow-y-auto flex-1 scrollbar-hide">
                {modalState.loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-6 text-red-700 dark:text-red-500" />
                    <p className="text-xl font-medium">Fetching real-time data...</p>
                  </div>
                ) : (
                  <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400">
                    <Markdown>{modalState.content}</Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-2xl text-gray-900 dark:text-white">Rate Experience</h3>
                <button onClick={() => setFeedbackModal({isOpen: false, serviceName: ''})} aria-label="Close modal" className="p-3 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <X className="w-8 h-8 text-gray-800 dark:text-gray-200" />
                </button>
              </div>
              <div className="p-10">
                {feedbackSubmitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                      <Star className="w-12 h-12 fill-current" />
                    </div>
                    <h4 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Thank You!</h4>
                    <p className="text-xl text-gray-500 dark:text-gray-400">Your feedback helps improve our services.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">How was your experience with <strong className="text-gray-900 dark:text-white">{feedbackModal.serviceName}</strong>?</p>
                    <div className="flex justify-center gap-4 mb-10">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`p-3 rounded-full transition-colors ${rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-200 dark:hover:text-yellow-200/50'}`}
                        >
                          <Star className={`w-12 h-12 ${rating >= star ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-lg mb-8 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none h-40 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="Tell us more about your experience (optional)..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    ></textarea>
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={rating === 0}
                      className="w-full bg-red-600 text-white font-bold py-5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all text-xl shadow-xl shadow-red-100 dark:shadow-none"
                    >
                      Submit Feedback
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
