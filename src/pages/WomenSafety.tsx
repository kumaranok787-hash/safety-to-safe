import { useState, useEffect } from 'react';
import { Phone, Shield, FileText, MapPin, AlertTriangle, Loader2, Info, Search, Locate } from 'lucide-react';
import { clsx } from 'clsx';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { getNearbyPlaces } from '../services/geminiService';

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

const tabs = ['Helplines', 'Safety Tips', 'Sakhi Centre', 'Schemes', 'Report'];

export default function WomenSafety() {
  const [activeTab, setActiveTab] = useState('Helplines');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number} | null>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setSearchLocation(loc);
        },
        (err) => {
          console.error(err);
          setLocationError('Location access denied. Please use search.');
          // Default to New Delhi if location fails
          setSearchLocation({ lat: 28.6139, lng: 77.2090 });
        }
      );
    } else {
      setLocationError('Geolocation not supported.');
      setSearchLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Sakhi Centre' && searchLocation) {
      fetchSakhiCentres();
    }
  }, [activeTab, searchLocation]);

  const fetchSakhiCentres = async () => {
    if (isMapLoading) return;
    setIsMapLoading(true);
    try {
      const data = await getNearbyPlaces('Sakhi Centre', searchLocation?.lat, searchLocation?.lng);
      setPlaces(data.places || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMapLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsMapLoading(true);
    try {
      // Search for the location first
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setSearchLocation(newLoc);
        setLocationError('');
      } else {
        alert('Location not found');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMapLoading(false);
    }
  };

  const handleRecenter = () => {
    if (userLocation) {
      setSearchLocation(userLocation);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setSearchLocation(loc);
        },
        () => alert('Could not get current location')
      );
    }
  };

  const helplines = [
    { num: '1090', name: 'Women Helpline', desc: 'Domestic abuse, harassment' },
    { num: '181', name: 'Domestic Abuse', desc: 'Women in distress' },
    { num: '1091', name: 'Women Police', desc: 'Direct police connection' },
    { num: '112', name: 'National Emergency', desc: 'All emergencies' },
  ];

  return (
    <div className="min-h-full bg-[#fcfcfc] pb-24 font-sans">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-12 px-12">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-pink-50 border border-pink-100 text-pink-600 text-xs font-bold uppercase tracking-wider mb-6">
                <Shield className="w-4 h-4" />
                Protection & Support
              </div>
              <h1 className="text-5xl md:text-8xl font-display font-bold text-gray-900 tracking-tight">
                Women & <span className="text-pink-600">Child Safety</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 mt-4 font-medium">Confidential help, resources, and emergency support for women and children.</p>
            </div>
          </div>
          
          <div className="max-w-[1600px] mx-auto flex gap-4 mt-12 overflow-x-auto scrollbar-hide pb-4">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-8 py-4 rounded-2xl text-lg font-bold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2',
                  activeTab === tab ? 'bg-pink-700 text-white shadow-xl shadow-pink-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-12 py-16">
        <div className="max-w-[1600px] mx-auto">
        {activeTab === 'Helplines' && (
          <div className="space-y-3">
            {helplines.map((hl) => (
              <div key={hl.num} className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-pink-50 text-pink-600 p-3 rounded-full">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <a href={`tel:${hl.num}`} className="hover:underline decoration-pink-500 underline-offset-4">
                      <h3 className="font-bold text-gray-900 text-lg">{hl.num}</h3>
                    </a>
                    <p className="text-xs font-medium text-gray-900">{hl.name}</p>
                    <p className="text-[10px] text-gray-600">{hl.desc}</p>
                  </div>
                </div>
                <a href={`tel:${hl.num}`} aria-label={`Call ${hl.name} at ${hl.num}`} className="bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2">
                  Call
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Safety Tips' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-pink-600">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold">General Safety Tips</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Always trust your instincts. If a situation feels wrong, leave immediately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Keep emergency contacts on speed dial and share your live location with trusted friends or family when traveling alone.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Stay aware of your surroundings. Avoid using headphones in isolated areas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>If you feel you are being followed, head to a crowded, well-lit public place like a store or a police station.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-pink-600">
                <Info className="w-5 h-5" />
                <h3 className="font-bold">Digital Safety</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Do not share sensitive personal information or real-time locations publicly on social media.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Use strong, unique passwords for your accounts and enable two-factor authentication.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500 font-bold">•</span>
                  <span>Block and report any abusive or harassing profiles immediately.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'Report' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-pink-600">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold">Confidential Incident Report</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">Your identity will be kept strictly confidential. You can also report anonymously.</p>
            
            <form className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block" htmlFor="incident-type">Incident Type</label>
                <select id="incident-type" className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>Select type...</option>
                  <option>Domestic Violence</option>
                  <option>Cyber Harassment</option>
                  <option>Workplace Harassment</option>
                  <option>Child Abuse</option>
                  <option>Other</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block" htmlFor="location-details">Location Details</label>
                <input id="location-details" type="text" placeholder="City, Area, Landmark" className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block" htmlFor="incident-desc">Description</label>
                <textarea id="incident-desc" placeholder="Describe what happened..." rows={4} className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="anonymous" className="rounded text-pink-700 focus:ring-pink-500 w-4 h-4" />
                <label htmlFor="anonymous" className="text-sm text-gray-700 font-medium">Submit Anonymously</label>
              </div>

              <button type="button" aria-label="Submit Incident Report" className="w-full bg-pink-700 text-white font-bold py-3 rounded-xl shadow-md shadow-pink-200 active:scale-95 transition-transform mt-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2">
                Submit Report
              </button>
            </form>
          </div>
        )}

        {activeTab === 'Sakhi Centre' && (
          <div className="space-y-4">
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-pink-900">One Stop Centre (OSC) Scheme</h3>
              <p className="text-xs text-pink-800 mt-1">Providing integrated support and assistance to women affected by violence, both in private and public spaces.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900">Find Sakhi Centres</h3>
                <p className="text-xs text-gray-600 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> Nearby Centres</p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by city or area..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-pink-700 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                >
                  Search
                </button>
              </form>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-64 relative mt-2">
                {!navigator.onLine ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm font-bold text-gray-700">Map Unavailable</p>
                    <p className="text-xs text-gray-500 mt-1">Please connect to the internet to view nearby Sakhi Centres on the map.</p>
                  </div>
                ) : !searchLocation ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-700 mb-2" />
                    <p className="text-xs text-gray-600 font-medium">Getting your location...</p>
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    {isMapLoading && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                        <span className="text-xs font-bold text-gray-700">Updating map...</span>
                      </div>
                    )}
                    <MapContainer center={[searchLocation.lat, searchLocation.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                      />
                      <MapUpdater center={[searchLocation.lat, searchLocation.lng]} />
                      
                      {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
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
                                <a 
                                  href={place.uri}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-block"
                                >
                                  Get Directions
                                </a>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MarkerClusterGroup>
                    </MapContainer>
                    <button 
                      onClick={handleRecenter}
                      aria-label="Re-center map on current location"
                      className="absolute bottom-4 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border border-gray-200 text-pink-600 active:scale-90 transition-transform hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <Locate className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>

              {locationError && (
                <p className="text-[10px] text-red-500 mt-2 px-1">{locationError}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button aria-label="Call District Sakhi Centre" className="flex-1 bg-pink-50 text-pink-800 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <Phone className="w-4 h-4" /> Call Helpline
                </button>
                <button 
                  onClick={() => {
                    if (searchLocation) {
                      window.open(`https://www.google.com/maps/search/Sakhi+Centre/@${searchLocation.lat},${searchLocation.lng},12z`, '_blank');
                    } else {
                      window.open(`https://www.google.com/maps/search/Sakhi+Centre`, '_blank');
                    }
                  }}
                  aria-label="Get directions to District Sakhi Centre" 
                  className="flex-1 bg-blue-50 text-blue-800 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <MapPin className="w-4 h-4" /> View All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
