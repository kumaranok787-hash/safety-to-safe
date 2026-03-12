import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, Phone, Navigation, Activity, ShieldPlus, Heart, Search, Loader2, Edit2, User, CheckCircle2, AlertTriangle, Cloud, CloudOff, Save, WifiOff, Locate, ChevronRight, Clock, Info, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { syncToCloud, fetchFromCloud } from '../utils/cloudSync';
import { getNearbyPlaces } from '../services/geminiService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DonorRegistrationModal from '../components/DonorRegistrationModal';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const tabs = [
  { id: 'Hospitals', icon: ShieldPlus },
  { id: 'Ambulance', icon: Activity },
  { id: 'Blood Bank', icon: Heart },
  { id: 'Schemes', icon: CheckCircle2 },
  { id: 'Medical ID', icon: User }
];

export default function Health() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'Hospitals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [bloodBankSearch, setBloodBankSearch] = useState('');
  const [ambulanceStatus, setAmbulanceStatus] = useState<'idle' | 'requesting' | 'tracking'>('idle');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);

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

  useEffect(() => {
    // Load cached hospitals on mount
    const cached = localStorage.getItem('cached_hospitals');
    if (cached) {
      try {
        setHospitals(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  useEffect(() => {
    const defaultLocation = { lat: 28.6139, lng: 77.2090 }; // New Delhi fallback

    if (navigator.geolocation) {
      // Get initial position once for the API call
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (activeTab === 'Hospitals' && !isInitialFetchDone) {
            setIsInitialFetchDone(true);
            handleFindNearbyWithLocation('hospitals', loc.lat, loc.lng);
          }
        },
        (err) => {
          console.warn("Initial geolocation error:", err);
          setUserLocation(defaultLocation);
          if (activeTab === 'Hospitals' && !isInitialFetchDone) {
            setIsInitialFetchDone(true);
            handleFindNearbyWithLocation('hospitals', defaultLocation.lat, defaultLocation.lng);
          }
        },
        { timeout: 5000 }
      );

      // Watch position only for map updates, not for API calls
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
        },
        (err) => {
          console.warn("Geolocation watch error:", err.message || err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      setUserLocation(defaultLocation);
    }
  }, [activeTab, hospitals.length, isInitialFetchDone]);

  const handleRecenter = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (activeTab === 'Hospitals') {
            handleFindNearbyWithLocation('hospitals', loc.lat, loc.lng);
          }
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
          setError('Could not get current location. Using default.');
        }
      );
    }
  };

  const calculateDistance = (lat: number, lng: number) => {
    if (!userLocation) return null;
    const R = 6371; // km
    const dLat = (lat - userLocation.lat) * Math.PI / 180;
    const dLon = (lng - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  useEffect(() => {
    let interval: any;
    if (ambulanceStatus === 'tracking' && userLocation) {
      if (!ambulanceLocation) {
        setAmbulanceLocation({
          lat: userLocation.lat + 0.015,
          lng: userLocation.lng + 0.015
        });
      }

      interval = setInterval(() => {
        setAmbulanceLocation(prev => {
          if (!prev) return prev;
          const latDiff = userLocation.lat - prev.lat;
          const lngDiff = userLocation.lng - prev.lng;
          
          if (Math.abs(latDiff) < 0.0001 && Math.abs(lngDiff) < 0.0001) {
            clearInterval(interval);
            return prev;
          }

          return {
            lat: prev.lat + latDiff * 0.05,
            lng: prev.lng + lngDiff * 0.05
          };
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [ambulanceStatus, userLocation]);

  const [medicalId, setMedicalId] = useState({
    name: '',
    bloodGroup: '',
    allergies: '',
    conditions: '',
    medications: '',
    emergencyContact: ''
  });
  const [isEditingMedicalId, setIsEditingMedicalId] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Try fetching from secure cloud first
      const cloudMedicalId = await fetchFromCloud('medicalId');
      if (cloudMedicalId) {
        setMedicalId(cloudMedicalId);
        localStorage.setItem('medicalId', JSON.stringify(cloudMedicalId));
        return;
      }

      const saved = localStorage.getItem('medicalId');
      if (saved) {
        setMedicalId(JSON.parse(saved));
      } else {
        setIsEditingMedicalId(true);
      }
    };
    
    loadData();
  }, []);

  const handleSaveMedicalId = async (closeEditor = true) => {
    setIsSyncing(true);
    setSyncStatus('idle');
    
    // Save locally first
    localStorage.setItem('medicalId', JSON.stringify(medicalId));
    
    // Sync to secure cloud
    const success = await syncToCloud(medicalId, 'medicalId');
    
    setIsSyncing(false);
    if (success) {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('error');
    }
    
    if (closeEditor) {
      setIsEditingMedicalId(false);
    }
  };

  // Auto-save Medical ID
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('medicalId');
      if (saved && saved !== JSON.stringify(medicalId)) {
        handleSaveMedicalId(false);
      }
    }, 5000); // 5 second debounce for auto-save
    return () => clearTimeout(timer);
  }, [medicalId]);

  const handleManualSearch = async (type: 'hospitals' | 'bloodBanks') => {
    if (isOffline) {
      setError('You are offline. Search requires an internet connection.');
      return;
    }
    setError('');
    
    const searchQuery = type === 'hospitals' ? hospitalSearch : bloodBankSearch;
    if (!searchQuery.trim()) {
      setError('Please enter a location or name to search.');
      return;
    }
    
    setLoading(true);
    try {
      const { places } = await getNearbyPlaces(
        `${type === 'hospitals' ? 'hospital' : 'blood bank'} ${searchQuery}`,
        userLocation?.lat || 28.6139,
        userLocation?.lng || 77.2090
      );
      
      if (places && places.length > 0) {
        if (type === 'hospitals') {
          setHospitals(places);
          localStorage.setItem('cached_hospitals', JSON.stringify(places));
        }
      } else {
        setError(`No ${type === 'hospitals' ? 'hospitals' : 'blood banks'} found for "${searchQuery}".`);
      }
    } catch (e) {
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindNearbyWithLocation = async (type: 'hospitals' | 'bloodBanks', lat: number, lng: number) => {
    if (isOffline) {
      setError('You are offline. Finding nearby locations requires an internet connection.');
      return;
    }
    if (loading) return; // Prevent concurrent calls
    
    setLoading(true);
    setError('');
    
    try {
      const { places } = await getNearbyPlaces(
        type === 'hospitals' ? 'hospital' : 'blood bank',
        lat,
        lng
      );
      
      if (places && places.length > 0) {
        if (type === 'hospitals') {
          setHospitals(places);
          localStorage.setItem('cached_hospitals', JSON.stringify(places));
        }
      } else {
        setError(`No nearby ${type === 'hospitals' ? 'hospitals' : 'blood banks'} found.`);
      }
    } catch (e) {
      setError('Failed to find nearby locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindNearby = async (type: 'hospitals' | 'bloodBanks') => {
    if (isOffline) {
      setError('You are offline. Finding nearby locations requires an internet connection.');
      return;
    }
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        await handleFindNearbyWithLocation(type, lat, lng);
      },
      (err) => {
        setError('Location access denied. Please enable location permissions.');
        setLoading(false);
      }
    );
  };

  // Helper component to recenter map when user location changes
  function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  }

  return (
    <div className="min-h-full bg-[#f8f9fa] pb-24 font-sans">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 pt-24 pb-16 px-6 md:px-16">
        <div className="w-full">
          <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-bold uppercase tracking-widest mb-8">
                  <Heart className="w-5 h-5" />
                  Professional Health Network
                </div>
                <h1 className="text-6xl md:text-9xl font-display font-black text-gray-900 tracking-tighter leading-none">
                  Health <span className="text-green-600">Portal</span>
                </h1>
                <p className="text-2xl md:text-3xl text-gray-500 mt-8 font-medium max-w-4xl leading-relaxed">
                  Your unified interface for emergency response, hospital discovery, and secure medical records management.
                </p>
              </div>
            </div>
          <div className="max-w-[1800px] mx-auto flex gap-6 mt-16 overflow-x-auto scrollbar-hide pb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-10 py-5 rounded-3xl text-xl font-black whitespace-nowrap transition-all focus:outline-none focus:ring-4 focus:ring-green-500/20 flex items-center gap-4 border-2',
                  activeTab === tab.id 
                    ? 'bg-green-700 text-white border-green-700 shadow-2xl shadow-green-200 scale-105' 
                    : 'bg-white text-gray-500 border-gray-100 hover:border-green-200 hover:bg-green-50/30'
                )}
              >
                <tab.icon className={clsx('w-7 h-7', activeTab === tab.id ? 'text-white' : 'text-green-600')} />
                {tab.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-16 py-20">
        <div className="max-w-[1800px] mx-auto space-y-16">
        {activeTab === 'Hospitals' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="relative flex-1">
                <Search className="w-10 h-10 absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by city, area or hospital name..." 
                  value={hospitalSearch}
                  aria-label="Search hospitals"
                  onChange={(e) => setHospitalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch('hospitals')}
                  className="w-full bg-white border-2 border-gray-100 rounded-[2.5rem] py-8 pl-20 pr-10 text-3xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 shadow-2xl shadow-gray-100 transition-all" 
                />
              </div>
              <button 
                onClick={() => handleManualSearch('hospitals')}
                disabled={loading}
                aria-label="Execute search"
                className="bg-green-700 text-white px-16 py-8 rounded-[2.5rem] font-black shadow-2xl shadow-green-200 active:scale-95 transition-all disabled:opacity-70 text-3xl hover:bg-green-800 flex items-center gap-4"
              >
                {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Search className="w-10 h-10" />}
                Search
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-6 overflow-x-auto scrollbar-hide py-4">
              {['Open Now', 'Top Rated', 'Near Me', 'Government', 'Private', 'Specialty'].map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    if (filter === 'Near Me') handleFindNearby('hospitals');
                    else handleManualSearch('hospitals');
                  }}
                  className="flex-shrink-0 px-10 py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-full text-xl font-black hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all focus:outline-none focus:ring-4 focus:ring-green-500/20"
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-10 my-12">
              <div className="h-0.5 bg-gray-100 flex-1"></div>
              <span className="text-2xl text-gray-300 font-black uppercase tracking-[0.3em]">Quick Access</span>
              <div className="h-0.5 bg-gray-100 flex-1"></div>
            </div>

            <button 
              onClick={() => handleFindNearby('hospitals')}
              disabled={loading}
              className="w-full bg-white border-4 border-green-700 text-green-700 font-black py-10 rounded-[4rem] shadow-2xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-6 disabled:opacity-70 disabled:active:scale-100 focus:outline-none focus:ring-8 focus:ring-green-500/10 hover:bg-green-50"
            >
              {loading ? <Loader2 className="w-12 h-12 animate-spin" /> : <MapPin className="w-12 h-12" />}
              <span className="text-4xl">{loading ? 'Locating nearby hospitals...' : 'Find Nearby Hospitals'}</span>
            </button>
            
            {error && <div className="text-red-600 text-2xl p-10 bg-red-50 rounded-[3rem] border-2 border-red-100 font-black flex items-center gap-4">
              <AlertTriangle className="w-10 h-10" />
              {error}
            </div>}
            
            <div className="bg-white rounded-[4rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden h-[800px] relative mt-16">
              {isOffline && (
                <div className="absolute top-6 left-6 right-6 bg-yellow-100 border border-yellow-300 text-yellow-800 text-lg font-bold px-6 py-4 rounded-2xl z-[1000] flex items-center justify-center gap-3 shadow-xl">
                  <WifiOff className="w-6 h-6" />
                  Offline Mode: Showing cached map and locations
                </div>
              )}
              {!userLocation ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                  <Loader2 className="w-16 h-16 animate-spin text-green-700 mb-6" />
                  <p className="text-2xl text-gray-600 font-bold">Acquiring GPS Signal...</p>
                </div>
              ) : (
                <div className="relative h-full w-full">
                  {loading && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-8 py-4 rounded-full shadow-2xl border border-gray-200 flex items-center gap-4">
                      <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                      <span className="text-lg font-bold text-gray-800">Updating Map...</span>
                    </div>
                  )}
                  <MapContainer 
                    center={[userLocation.lat, userLocation.lng]} 
                    zoom={14} 
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                      url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    />
                    <MapUpdater center={[userLocation.lat, userLocation.lng]} />
                    
                    {/* User Location Marker */}
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={DefaultIcon}>
                      <Popup>
                        <div className="font-bold text-lg">You are here</div>
                      </Popup>
                    </Marker>
                    
                    {/* Hospital Markers */}
                    {hospitals.map((hospital, idx) => (
                      <Marker key={idx} position={[hospital.lat, hospital.lng]} icon={DefaultIcon}>
                        <Popup>
                          <div className="p-2">
                            <div className="text-xl font-bold text-gray-900 mb-1">{hospital.title}</div>
                            <div className="text-base text-gray-600 mb-4">{hospital.address}</div>
                            <a href={hospital.uri} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                              <Navigation className="w-4 h-4" /> Get Directions
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                  <button 
                    onClick={handleRecenter}
                    aria-label="Re-center map on current location"
                    className="absolute bottom-8 right-8 z-[1000] bg-white p-6 rounded-full shadow-2xl border border-gray-200 text-green-700 active:scale-90 transition-all hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-green-500"
                  >
                    <Locate className="w-10 h-10" />
                  </button>
                </div>
              )}
            </div>

            {/* Hospital List */}
            {hospitals.length > 0 && (
              <div className="mt-16 space-y-8">
                <h3 className="text-3xl font-bold text-gray-900 px-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    Nearby Hospitals
                    <span className="text-sm bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-bold border border-blue-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Google Powered
                    </span>
                  </div>
                  <span className="text-lg font-medium text-gray-400 uppercase tracking-widest">{hospitals.length} found</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hospitals.map((hospital, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={idx} 
                      className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex items-center justify-between group hover:border-green-200 transition-all"
                    >
                      <div className="flex-1 min-w-0 pr-8">
                        <h4 className="font-bold text-gray-900 text-2xl truncate mb-2">{hospital.title}</h4>
                        <p className="text-lg text-gray-500 truncate mb-4">{hospital.address}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-sm bg-green-50 text-green-700 px-4 py-1.5 rounded-full font-bold border border-green-100">Open Now</span>
                          {userLocation && (
                            <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">{calculateDistance(hospital.lat, hospital.lng)} km away</span>
                          )}
                        </div>
                      </div>
                      <a 
                        href={hospital.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-green-50 p-6 rounded-3xl text-green-700 group-hover:bg-green-700 group-hover:text-white transition-all shadow-lg"
                      >
                        <Navigation className="w-10 h-10" />
                      </a>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Ambulance' && (
          <div className="space-y-16">
            {/* Professional Dashboard Style Banner */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-green-700 text-white rounded-[4rem] p-16 shadow-[0_32px_64px_-16px_rgba(21,128,61,0.3)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="bg-white/20 p-10 rounded-[3rem] backdrop-blur-md shadow-2xl">
                    <Activity className="w-20 h-20 animate-pulse text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/20 text-white text-sm font-black uppercase tracking-widest mb-6 backdrop-blur-sm border border-white/20">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                      Live Network Active
                    </div>
                    <h3 className="font-black text-6xl md:text-7xl tracking-tighter mb-6 leading-none">Emergency <span className="text-green-300">Response</span></h3>
                    <p className="text-2xl text-green-50 font-medium leading-relaxed max-w-2xl">
                      Our intelligent dispatch system is currently monitoring <span className="font-black text-white">12 ALS Units</span> in your immediate vicinity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-gray-100 flex flex-col justify-between group hover:border-green-200 transition-all">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-green-50 rounded-2xl">
                      <Clock className="w-10 h-10 text-green-600" />
                    </div>
                    <span className="text-sm font-black text-green-600 uppercase tracking-widest bg-green-50 px-4 py-2 rounded-full">Optimal</span>
                  </div>
                  <div>
                    <div className="text-5xl font-black text-gray-900 tracking-tighter mb-2">8.2 <span className="text-2xl text-gray-400">mins</span></div>
                    <div className="text-lg text-gray-500 font-bold uppercase tracking-widest">Avg. Response Time</div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[85%] rounded-full" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-medium mt-6 italic">Real-time data based on last 50 requests in your area.</p>
              </div>
            </div>
            
            {ambulanceStatus === 'idle' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3 bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="p-5 bg-red-50 rounded-[2rem]">
                      <ShieldPlus className="w-12 h-12 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-5xl font-black text-gray-900 tracking-tight">Request Dispatch</h3>
                      <p className="text-xl text-gray-500 font-medium mt-2">Immediate assistance for critical medical situations.</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Patient Full Name</label>
                        <input type="text" placeholder="e.g. John Doe" className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-7 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-8 focus:ring-red-500/5 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-4">
                        <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Emergency Contact</label>
                        <input type="tel" placeholder="+91 00000 00000" className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-7 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-8 focus:ring-red-500/5 transition-all shadow-inner" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Nature of Emergency & Landmarks</label>
                      <textarea placeholder="Describe symptoms and provide nearby landmarks for faster navigation..." rows={4} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-7 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-8 focus:ring-red-500/5 transition-all shadow-inner resize-none"></textarea>
                    </div>
                    <button 
                      onClick={() => {
                        setAmbulanceStatus('requesting');
                        setTimeout(() => setAmbulanceStatus('tracking'), 2000);
                      }}
                      className="w-full bg-red-600 text-white font-black py-12 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(220,38,38,0.4)] active:scale-95 transition-all text-4xl hover:bg-red-700 hover:shadow-red-300 flex items-center justify-center gap-8 group"
                    >
                      <Phone className="w-14 h-14 group-hover:rotate-12 transition-transform" />
                      Confirm Emergency Request
                    </button>
                    <p className="text-center text-gray-400 text-lg font-bold">By clicking, you confirm this is a life-threatening emergency.</p>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-[3.5rem] p-12 shadow-xl border border-gray-100">
                    <h4 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                      <Info className="w-8 h-8 text-blue-600" />
                      Quick Instructions
                    </h4>
                    <ul className="space-y-8">
                      {[
                        { icon: CheckCircle2, text: "Stay calm and keep the phone line clear.", color: "text-green-600" },
                        { icon: MapPin, text: "Ensure someone is outside to guide the unit.", color: "text-blue-600" },
                        { icon: Activity, text: "Keep patient's medical ID ready for paramedics.", color: "text-red-600" }
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-6">
                          <div className={`mt-1 p-3 rounded-xl bg-gray-50 ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                          </div>
                          <p className="text-xl text-gray-600 font-medium leading-relaxed">{item.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-900 text-white rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
                    <h4 className="text-2xl font-black mb-6 relative z-10">Medical ID Access</h4>
                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed relative z-10">Your Medical ID will be automatically shared with the responding paramedics for faster diagnosis.</p>
                    <button 
                      onClick={() => setActiveTab('Medical ID')}
                      className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-5 rounded-2xl transition-all border border-white/20 backdrop-blur-sm"
                    >
                      Update Medical ID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {ambulanceStatus === 'requesting' && (
              <div className="bg-white rounded-[4rem] p-32 shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
                  <Loader2 className="w-32 h-32 text-red-600 animate-spin relative z-10" />
                </div>
                <h3 className="font-black text-5xl text-gray-900 mt-12 mb-6">Dispatching Nearest Unit</h3>
                <p className="text-3xl text-gray-500 font-medium max-w-2xl leading-relaxed">
                  Please stay calm. We are assigning the closest emergency vehicle to your location using real-time GPS routing.
                </p>
              </div>
            )}

            {ambulanceStatus === 'tracking' && (
              <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                  <h3 className="text-5xl font-black text-gray-900 flex items-center gap-6">
                    <div className="bg-green-100 p-4 rounded-full">
                      <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    Ambulance En Route
                  </h3>
                  <div className="flex items-center gap-4 bg-red-50 px-8 py-4 rounded-full border border-red-100">
                    <div className="w-4 h-4 bg-red-600 rounded-full animate-ping" />
                    <span className="text-red-700 text-2xl font-black uppercase tracking-widest">
                      Live Tracking
                    </span>
                  </div>
                </div>
                
                {/* Real-time Map */}
                <div className="relative h-[600px] bg-[#e5e3df] rounded-[3rem] overflow-hidden border-4 border-gray-50 mb-12 shadow-2xl">
                  {!navigator.onLine ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-16 text-center">
                      <AlertTriangle className="w-24 h-24 text-gray-300 mb-8" />
                      <p className="text-4xl font-black text-gray-900">Map Unavailable Offline</p>
                      <p className="text-2xl text-gray-500 mt-6 leading-relaxed">Please connect to the internet to view the real-time ambulance location.</p>
                    </div>
                  ) : ambulanceLocation ? (
                    <iframe 
                      title="Ambulance Tracking Map"
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      src={`https://maps.google.com/maps?q=${ambulanceLocation.lat},${ambulanceLocation.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      className="grayscale-[20%] contrast-[1.1]"
                    ></iframe>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                      <Loader2 className="w-20 h-20 animate-spin text-red-600 mb-8" />
                      <p className="text-3xl text-gray-500 font-black">Connecting to GPS Stream...</p>
                    </div>
                  )}
                  
                  {/* Overlay to show coordinates */}
                  {ambulanceLocation && (
                    <div className="absolute bottom-10 left-10 bg-white/90 backdrop-blur-xl px-8 py-4 rounded-3xl text-lg font-mono text-gray-600 shadow-2xl border border-gray-100 pointer-events-none">
                      LAT: {ambulanceLocation.lat.toFixed(5)}<br/>
                      LNG: {ambulanceLocation.lng.toFixed(5)}
                    </div>
                  )}
                </div>

                {/* Driver Info */}
                <div className="flex flex-col md:flex-row items-center justify-between bg-gray-50 p-12 rounded-[3.5rem] border-2 border-gray-100 shadow-inner gap-10">
                  <div className="flex items-center gap-10">
                    <div className="w-32 h-32 bg-white border-8 border-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden">
                      <User className="w-16 h-16 text-gray-300" />
                    </div>
                    <div>
                      <div className="font-black text-4xl text-gray-900">Rajesh Kumar</div>
                      <div className="text-2xl text-gray-500 font-bold mt-2 uppercase tracking-widest">DL 1A 1234 • ALS Emergency Unit</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <a href="tel:102" className="bg-green-600 text-white p-10 rounded-full shadow-2xl shadow-green-200 hover:bg-green-700 transition-all active:scale-90 flex items-center justify-center">
                      <Phone className="w-12 h-12" />
                    </a>
                  </div>
                </div>

                <div className="mt-16 flex flex-col md:flex-row justify-between items-center md:items-end px-8 gap-10">
                  <div className="text-center md:text-left">
                    <div className="text-2xl text-gray-400 font-black uppercase tracking-[0.2em] mb-4">Estimated Arrival</div>
                    <div className="font-black text-9xl text-red-600 tracking-tighter flex items-baseline gap-4">
                      8 <span className="text-4xl uppercase tracking-widest text-gray-400">mins</span>
                    </div>
                  </div>
                  <button onClick={() => setAmbulanceStatus('idle')} aria-label="Cancel Ambulance Request" className="text-2xl font-black text-gray-300 hover:text-red-600 transition-colors focus:outline-none focus:ring-8 focus:ring-gray-100 rounded-[2rem] px-10 py-4 border-2 border-transparent hover:border-red-100">
                    Cancel Request
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Schemes' && (
          <div className="space-y-16">
            {/* Schemes Search & Filter */}
            <div className="bg-white rounded-[4rem] p-16 border border-gray-100 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="p-5 bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-200">
                    <ShieldPlus className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-5xl font-black text-gray-900 tracking-tight">Government Health Schemes</h3>
                    <p className="text-xl text-gray-500 font-medium mt-2">Explore and apply for healthcare benefits provided by the government.</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="relative flex-1 group">
                    <Search className="w-10 h-10 absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search schemes by name, benefit or eligibility..." 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] py-8 pl-24 pr-10 text-3xl focus:outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 shadow-inner transition-all" 
                    />
                  </div>
                  <div className="flex gap-4">
                    {['All', 'Insurance', 'Medicines', 'Maternal'].map((filter) => (
                      <button key={filter} className={`px-8 py-4 rounded-2xl font-black text-xl transition-all ${filter === 'All' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {[
                {
                  title: "Ayushman Bharat (PM-JAY)",
                  description: "World's largest health insurance scheme providing free health coverage up to ₹5 lakhs per family per year for secondary and tertiary care hospitalization.",
                  tags: ['Free Coverage', 'Public & Private', 'Cashless'],
                  color: "orange",
                  icon: ShieldPlus
                },
                {
                  title: "Jan Aushadhi Kendra",
                  description: "Quality generic medicines at affordable prices for all. Save up to 90% on your monthly medicine bills. Find your nearest Kendra today.",
                  tags: ['Generic Meds', '90% Savings', 'Quality Assured'],
                  color: "blue",
                  icon: Heart
                },
                {
                  title: "PM Matru Vandana Yojana",
                  description: "Maternity benefit program providing financial assistance of ₹5,000 to pregnant and lactating mothers for the first living child of the family.",
                  tags: ['Maternal Health', 'Direct Benefit', 'Nutrition'],
                  color: "pink",
                  icon: Activity
                },
                {
                  title: "National Health Mission",
                  description: "Comprehensive healthcare services including reproductive, maternal, newborn, child and adolescent health, and communicable diseases control.",
                  tags: ['Rural & Urban', 'Public Health', 'Free Services'],
                  color: "emerald",
                  icon: Globe
                }
              ].map((scheme, idx) => (
                <div key={idx} className={`bg-white rounded-[4rem] p-16 border-2 border-${scheme.color}-100 shadow-2xl shadow-${scheme.color}-50 group hover:border-${scheme.color}-300 transition-all relative overflow-hidden flex flex-col`}>
                  <div className={`absolute top-0 right-0 w-64 h-64 bg-${scheme.color}-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110`} />
                  <div className="flex flex-col h-full relative z-10">
                    <div className={`bg-${scheme.color}-600 text-white w-24 h-24 rounded-[2rem] flex items-center justify-center mb-12 shadow-2xl shadow-${scheme.color}-200 group-hover:rotate-6 transition-transform`}>
                      <scheme.icon className="w-12 h-12" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-5xl font-black text-gray-900 mb-8 tracking-tight">{scheme.title}</h3>
                      <p className="text-2xl text-gray-600 leading-relaxed mb-12 font-medium">
                        {scheme.description}
                      </p>
                      <div className="flex flex-wrap gap-4 mb-12">
                        {scheme.tags.map(tag => (
                          <span key={tag} className={`px-6 py-2 bg-${scheme.color}-50 text-${scheme.color}-700 rounded-full text-lg font-bold border border-${scheme.color}-100`}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button className={`w-full text-3xl font-black text-white bg-${scheme.color}-600 px-16 py-8 rounded-3xl shadow-2xl shadow-${scheme.color}-200 hover:bg-${scheme.color}-700 transition-all flex items-center justify-center gap-4`}>
                      Learn More & Apply
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'Blood Bank' && (
          <div className="space-y-16">
            <div className="bg-white rounded-[4rem] p-16 border border-gray-100 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-12">
                  <div className="p-5 bg-red-600 rounded-[2rem] shadow-xl shadow-red-200">
                    <Heart className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-5xl font-black text-gray-900 tracking-tight">Blood Inventory Search</h3>
                    <p className="text-xl text-gray-500 font-medium mt-2">Find real-time availability of blood units in certified banks.</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="relative flex-1 group">
                    <Search className="w-10 h-10 absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search by city, area or blood bank name..." 
                      value={bloodBankSearch}
                      aria-label="Search blood banks"
                      onChange={(e) => setBloodBankSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch('bloodBanks')}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] py-8 pl-24 pr-10 text-3xl focus:outline-none focus:border-red-500 focus:ring-8 focus:ring-red-500/5 shadow-inner transition-all" 
                    />
                  </div>
                  <button 
                    onClick={() => handleManualSearch('bloodBanks')}
                    disabled={loading}
                    className="bg-red-700 text-white px-20 py-8 rounded-[2.5rem] font-black shadow-2xl shadow-red-200 active:scale-95 transition-all disabled:opacity-70 text-3xl hover:bg-red-800 flex items-center justify-center gap-6 group"
                  >
                    {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Search className="w-10 h-10 group-hover:scale-110 transition-transform" />}
                    Search
                  </button>
                </div>

                <div className="flex items-center gap-12 my-16">
                  <div className="h-px bg-gray-100 flex-1"></div>
                  <span className="text-xl text-gray-300 font-black uppercase tracking-[0.4em]">Advanced Discovery</span>
                  <div className="h-px bg-gray-100 flex-1"></div>
                </div>

                <button 
                  onClick={() => handleFindNearby('bloodBanks')}
                  disabled={loading}
                  className="w-full bg-white border-4 border-red-700 text-red-700 font-black py-12 rounded-[4rem] shadow-2xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-8 text-4xl hover:bg-red-50 group"
                >
                  {loading ? <Loader2 className="w-14 h-14 animate-spin" /> : <MapPin className="w-14 h-14 group-hover:bounce transition-transform" />}
                  <span className="text-4xl">{loading ? 'Scanning Nearby Facilities...' : 'Locate Nearest Blood Banks'}</span>
                </button>
              </div>
            </div>
            
            {error && <div className="text-red-600 text-2xl p-12 bg-red-50 rounded-[3rem] border-2 border-red-100 font-black flex items-center gap-6 shadow-lg">
              <AlertTriangle className="w-12 h-12" />
              {error}
            </div>}
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
              <div className="xl:col-span-2 bg-white rounded-[4rem] shadow-2xl border border-gray-100 overflow-hidden h-[800px] relative group">
                {!navigator.onLine ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-20 text-center">
                    <AlertTriangle className="w-24 h-24 text-gray-300 mb-8" />
                    <p className="text-4xl font-black text-gray-900">Map Unavailable Offline</p>
                    <p className="text-2xl text-gray-500 mt-6 leading-relaxed">Please connect to the internet to view nearby blood banks.</p>
                  </div>
                ) : !userLocation ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
                      <Loader2 className="w-24 h-24 animate-spin text-red-700 relative z-10" />
                    </div>
                    <p className="text-3xl text-gray-600 font-black mt-10">Acquiring GPS Signal...</p>
                  </div>
                ) : (
                  <iframe 
                    title="Nearby Blood Banks Map"
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://maps.google.com/maps?q=Blood+Banks+near+${userLocation.lat},${userLocation.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    className="grayscale-[10%] contrast-[1.05] brightness-[1.02]"
                  ></iframe>
                )}
              </div>

              <div className="space-y-8">
                <div className="bg-white rounded-[3.5rem] p-12 shadow-xl border border-gray-100">
                  <h4 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                    <Activity className="w-8 h-8 text-red-600" />
                    Live Stock Status
                  </h4>
                  <div className="space-y-6">
                    {[
                      { type: 'O+', status: 'High', color: 'bg-green-500' },
                      { type: 'A+', status: 'Moderate', color: 'bg-yellow-500' },
                      { type: 'B+', status: 'Critical', color: 'bg-red-500' },
                      { type: 'AB+', status: 'Moderate', color: 'bg-yellow-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-xl text-red-600 shadow-sm">{item.type}</div>
                          <span className="text-lg font-bold text-gray-700">Blood Type</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-lg font-black text-gray-900">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-10 py-5 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-all">View Full Inventory</button>
                </div>

                <div className="bg-red-900 text-white rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform" />
                  <h4 className="text-2xl font-black mb-6 relative z-10">Be a Hero</h4>
                  <p className="text-red-100 text-lg mb-8 leading-relaxed relative z-10">Your single donation can save up to three lives. Join our donor network today.</p>
                  <button 
                    onClick={() => setIsDonorModalOpen(true)}
                    className="w-full bg-white text-red-900 font-black py-5 rounded-2xl transition-all hover:bg-red-50 shadow-xl active:scale-95"
                  >
                    Register as Donor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Medical ID' && (
          <div className="space-y-10 max-w-5xl">
            <div className="bg-red-600 text-white rounded-[3rem] p-12 shadow-2xl shadow-red-100 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <Heart className="w-12 h-12" />
                <h3 className="font-black text-4xl tracking-tight flex items-center gap-4">
                  Emergency Medical ID
                  {syncStatus === 'success' && <span title="Synced to secure cloud"><Cloud className="w-8 h-8 text-green-300" /></span>}
                  {syncStatus === 'error' && <span title="Cloud sync failed"><CloudOff className="w-8 h-8 text-yellow-300" /></span>}
                </h3>
              </div>
              {!isEditingMedicalId && (
                <button onClick={() => setIsEditingMedicalId(true)} className="bg-white/20 p-6 rounded-3xl hover:bg-white/30 transition-all active:scale-90">
                  <Edit2 className="w-8 h-8" />
                </button>
              )}
            </div>

            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100">
              {isEditingMedicalId ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Full Name</label>
                      <input type="text" value={medicalId.name} onChange={e => setMedicalId({...medicalId, name: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all" />
                    </div>
                    <div>
                      <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Blood Group</label>
                      <select value={medicalId.bloodGroup} onChange={e => setMedicalId({...medicalId, bloodGroup: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-black">
                        <option value="">Select Blood Group...</option>
                        <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Allergies</label>
                    <textarea value={medicalId.allergies} onChange={e => setMedicalId({...medicalId, allergies: e.target.value})} placeholder="e.g., Peanuts, Penicillin, Latex" rows={3} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"></textarea>
                  </div>
                  <div>
                    <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Pre-existing Conditions</label>
                    <textarea value={medicalId.conditions} onChange={e => setMedicalId({...medicalId, conditions: e.target.value})} placeholder="e.g., Asthma, Diabetes, Hypertension" rows={3} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"></textarea>
                  </div>
                  <div>
                    <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Current Medications</label>
                    <textarea value={medicalId.medications} onChange={e => setMedicalId({...medicalId, medications: e.target.value})} placeholder="e.g., Inhaler, Insulin, Aspirin" rows={3} className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"></textarea>
                  </div>
                  <div>
                    <label className="text-lg font-black text-gray-700 mb-4 block uppercase tracking-widest">Emergency Contact</label>
                    <input type="tel" value={medicalId.emergencyContact} onChange={e => setMedicalId({...medicalId, emergencyContact: e.target.value})} placeholder="Name & Phone Number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-6 px-8 text-2xl focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <button onClick={() => handleSaveMedicalId(true)} disabled={isSyncing} className="w-full bg-red-600 text-white font-black py-10 rounded-[2.5rem] shadow-2xl shadow-red-200 active:scale-95 transition-all mt-6 flex items-center justify-center gap-6 text-4xl hover:bg-red-700">
                      {isSyncing ? <Loader2 className="w-12 h-12 animate-spin" /> : <Save className="w-12 h-12" />}
                      {isSyncing ? 'Syncing...' : 'Save Medical ID'}
                    </button>
                    <p className="text-center text-gray-400 font-bold text-lg italic">Changes are automatically saved as you type</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="text-sm text-gray-400 font-black uppercase tracking-widest mb-2">Full Name</div>
                      <div className="text-3xl font-black text-gray-900">{medicalId.name || 'Not specified'}</div>
                    </div>
                    <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
                      <div className="text-sm text-red-400 font-black uppercase tracking-widest mb-2">Blood Group</div>
                      <div className="text-3xl font-black text-red-600">{medicalId.bloodGroup || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="text-sm text-gray-400 font-black uppercase tracking-widest mb-2">Allergies</div>
                      <div className="text-2xl font-bold text-gray-900 leading-relaxed">{medicalId.allergies || 'None reported'}</div>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="text-sm text-gray-400 font-black uppercase tracking-widest mb-2">Pre-existing Conditions</div>
                      <div className="text-2xl font-bold text-gray-900 leading-relaxed">{medicalId.conditions || 'None reported'}</div>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="text-sm text-gray-400 font-black uppercase tracking-widest mb-2">Current Medications</div>
                      <div className="text-2xl font-bold text-gray-900 leading-relaxed">{medicalId.medications || 'None reported'}</div>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                      <div className="text-sm text-gray-400 font-black uppercase tracking-widest mb-2">Emergency Contact</div>
                      <div className="text-2xl font-black text-gray-900 leading-relaxed">{medicalId.emergencyContact || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <DonorRegistrationModal isOpen={isDonorModalOpen} onClose={() => setIsDonorModalOpen(false)} />
    </div>
  </div>
  );
}
