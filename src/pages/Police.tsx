import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldAlert, FileText, MapPin, Search, AlertTriangle, Phone, Loader2, Navigation, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const tabs = ['File FIR', 'Track Case', 'Police Stations', 'Cyber Crime'];

export default function Police() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'File FIR');
  
  const [stationSearch, setStationSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [complaintType, setComplaintType] = useState('Vehicle Theft');
  const [missingPersonPhoto, setMissingPersonPhoto] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMissingPersonPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error(err)
      );
    }
  }, []);

  const handleManualSearch = async () => {
    setError('');
    
    if (!stationSearch.trim()) {
      setError('Please enter a location or name to search.');
      return;
    }
    
    window.open(`https://www.google.com/maps/search/Police+Stations+near+${encodeURIComponent(stationSearch)}`, '_blank');
  };

  const handleFindNearby = async () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.open(`https://www.google.com/maps/search/Police+Stations/@${position.coords.latitude},${position.coords.longitude},14z`, '_blank');
        setLoading(false);
      },
      (err) => {
        setError('Location access denied. Please enable location permissions.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-full bg-[#fcfcfc] pb-24 font-sans">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-12 px-12">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                <ShieldAlert className="w-4 h-4" />
                Law Enforcement
              </div>
              <h1 className="text-5xl md:text-8xl font-display font-bold text-gray-900 tracking-tight">
                Police & <span className="text-blue-600">Safety</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 mt-4 font-medium">Report incidents, track cases, and find nearby police stations.</p>
            </div>
          </div>
          
          <div className="max-w-[1600px] mx-auto flex gap-4 mt-12 overflow-x-auto scrollbar-hide pb-4">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-8 py-4 rounded-2xl text-lg font-bold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  activeTab === tab ? 'bg-blue-700 text-white shadow-xl shadow-blue-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-12 py-16">
        <div className="max-w-[1600px] mx-auto space-y-12">
        {activeTab === 'Cyber Crime' && (
          <div className="space-y-10">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-12 text-white shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-black text-4xl">Cyber Crime Helpline</h3>
                <ShieldAlert className="w-16 h-16 opacity-80" />
              </div>
              <div className="text-8xl font-black tracking-wider mb-6">1930</div>
              <p className="text-blue-100 text-2xl font-medium">Call immediately if you are a victim of financial fraud or cyber harassment.</p>
              <button aria-label="Dial 1930 Cyber Crime Helpline" className="mt-10 bg-white text-blue-800 w-full py-6 rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-2xl hover:bg-blue-50">
                Dial 1930 Now
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-xl">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">Common Fraud Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {['UPI Fraud', 'Job Scam', 'Loan App Harassment', 'Social Media Hack'].map((type) => (
                  <div key={type} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <span className="text-xl font-bold text-gray-800">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'File FIR' && (
          <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-gray-100">
            <div className="max-w-4xl">
              <h3 className="text-4xl font-bold text-gray-900 mb-4">e-FIR Registration</h3>
              <p className="text-xl text-gray-500 mb-12 leading-relaxed">Online FIR can only be filed for non-heinous crimes like theft of vehicles, mobile phones, or missing persons/documents. For serious crimes, please visit the nearest station.</p>
              
              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Complainant Name</label>
                    <input type="text" placeholder="Enter your full name" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Aadhar / ID Number</label>
                    <input type="text" placeholder="12-digit Aadhar number" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Complaint Type</label>
                  <select 
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-800"
                  >
                    <option>Vehicle Theft</option>
                    <option>Mobile/Electronics Theft</option>
                    <option>Missing Person</option>
                    <option>Missing Documents</option>
                    <option>Other Non-heinous</option>
                  </select>
                </div>

                {complaintType === 'Missing Person' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8 pt-10 border-t border-gray-100 mt-10"
                  >
                    <h4 className="text-2xl font-black text-blue-700 uppercase tracking-widest">Missing Person Details</h4>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Last Seen Location</label>
                      <input type="text" placeholder="e.g., Central Park, Near Metro Station" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Physical Description</label>
                      <textarea placeholder="Height, clothes worn, identifying marks..." rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Upload Photo</label>
                      <div className="flex items-center gap-8">
                        <label className="flex-1 cursor-pointer">
                          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 transition-all group">
                            <Camera className="w-12 h-12 text-gray-400 mb-4 group-hover:text-blue-500 transition-colors" />
                            <span className="text-xl text-gray-500 font-bold">Click to upload recent photo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          </div>
                        </label>
                        {missingPersonPhoto && (
                          <div className="w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                            <img src={missingPersonPhoto} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                <button type="button" aria-label="Proceed to Details" className="w-full bg-blue-700 text-white font-bold py-6 rounded-2xl shadow-2xl shadow-blue-100 active:scale-95 transition-all mt-6 text-2xl hover:bg-blue-800">
                  Proceed to Verification
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'Track Case' && (
          <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-gray-100 max-w-3xl">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">Track Case Status</h3>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed">Enter your FIR number or complaint ID to check the current progress of your case.</p>
            <div className="space-y-8">
              <input type="text" placeholder="Enter FIR Number or Complaint ID" aria-label="Enter FIR Number or Complaint ID" className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-6 px-8 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" />
              <button aria-label="Track Status" className="w-full bg-blue-700 text-white font-bold py-6 rounded-2xl shadow-2xl shadow-blue-100 active:scale-95 transition-all text-2xl hover:bg-blue-800">
                Track Status Now
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Police Stations' && (
          <div className="space-y-10">
            <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-xl">
              <div className="flex flex-wrap gap-4 mb-10">
                {['Traffic Police', 'Cyber Crime Unit', 'Local Station', 'Women Police Station'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStationSearch(filter)}
                    className="px-8 py-3 rounded-full text-lg font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all"
                  >
                    {filter}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative flex-1">
                  <Search className="w-8 h-8 absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by city, area or station name..." 
                    value={stationSearch}
                    aria-label="Search police stations"
                    onChange={(e) => setStationSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-6 pl-16 pr-8 text-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" 
                  />
                </div>
                <button 
                  onClick={handleManualSearch}
                  disabled={loading}
                  aria-label="Execute search"
                  className="bg-blue-700 text-white px-12 py-6 rounded-2xl font-bold shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-70 text-2xl hover:bg-blue-800"
                >
                  Search
                </button>
              </div>

              <div className="flex items-center gap-8 my-10">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-xl text-gray-400 font-bold uppercase tracking-widest">or</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <button 
                onClick={handleFindNearby}
                disabled={loading}
                aria-label="Find nearby police stations using GPS"
                className="w-full bg-blue-600 text-white font-bold py-8 rounded-2xl shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-4 text-3xl hover:bg-blue-700"
              >
                {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <MapPin className="w-10 h-10" />}
                {loading ? 'Locating nearby stations...' : 'Find Nearby Police Stations'}
              </button>
            </div>
            
            {error && <div className="text-red-600 text-xl p-8 bg-red-50 rounded-3xl border border-red-100 font-bold">{error}</div>}
            
            {!loading && !error && (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden h-[600px] relative">
                {!navigator.onLine ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-12 text-center">
                    <AlertTriangle className="w-20 h-20 text-gray-400 mb-6" />
                    <p className="text-3xl font-bold text-gray-900">Map Unavailable Offline</p>
                    <p className="text-xl text-gray-500 mt-4">Please connect to the internet to view nearby police stations on the interactive map.</p>
                  </div>
                ) : !userLocation ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <Loader2 className="w-16 h-16 animate-spin text-blue-700 mb-6" />
                    <p className="text-2xl text-gray-600 font-bold">Acquiring GPS Signal...</p>
                  </div>
                ) : (
                  <iframe 
                    title="Nearby Police Stations Map"
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://maps.google.com/maps?q=Police+Stations+near+${userLocation.lat},${userLocation.lng}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
