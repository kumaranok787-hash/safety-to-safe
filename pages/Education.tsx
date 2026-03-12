import { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertTriangle, Navigation, BookOpen, GraduationCap, Library, ExternalLink, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const mainTabs = ['Institutions', 'Resources', 'Admissions'];

const institutionTypes = [
  { id: 'Schools', query: 'Schools' },
  { id: 'Colleges', query: 'Colleges and Universities' },
  { id: 'Govt', query: 'Government Schools and Colleges' },
  { id: 'Private', query: 'Private Schools and Colleges' }
];

const resourcesList = [
  { name: 'DIKSHA', desc: 'Digital Infrastructure for Knowledge Sharing by NCERT.', link: 'https://diksha.gov.in/' },
  { name: 'SWAYAM', desc: 'Free online courses and certificates provided by the Government of India.', link: 'https://swayam.gov.in/' },
  { name: 'National Digital Library', desc: 'Virtual repository of learning resources with a single-window search facility.', link: 'https://ndl.iitkgp.ac.in/' },
  { name: 'ePathshala', desc: 'Educational resources including textbooks, audio, video, and periodicals.', link: 'https://epathshala.nic.in/' },
  { name: 'National Scholarship Portal', desc: 'One-stop solution for various scholarship schemes offered by the Government.', link: 'https://scholarships.gov.in/' }
];

const admissionsList = [
  { name: 'NTA (National Testing Agency)', desc: 'Conducts entrance examinations like JEE Main, NEET, CUET, UGC NET.', link: 'https://nta.ac.in/' },
  { name: 'UGC (University Grants Commission)', desc: 'Information on higher education, university approvals, and guidelines.', link: 'https://www.ugc.gov.in/' },
  { name: 'AICTE', desc: 'All India Council for Technical Education - approvals and admissions info for technical courses.', link: 'https://www.aicte-india.org/' },
  { name: 'CBSE Board', desc: 'Central Board of Secondary Education - exam results, syllabus, and announcements.', link: 'https://www.cbse.gov.in/' }
];

export default function Education() {
  const [activeMainTab, setActiveMainTab] = useState('Institutions');
  const [activeInstTab, setActiveInstTab] = useState(institutionTypes[0]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        setError('Location access denied. Please enable location permissions to find nearby institutions.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const openInGoogleMaps = () => {
    if (userLocation) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(activeInstTab.query)}/@${userLocation.lat},${userLocation.lng},14z`, '_blank');
    }
  };

  return (
    <div className="min-h-full bg-[#fcfcfc] pb-24 font-sans flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-12 px-12">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6">
                <BookOpen className="w-4 h-4" />
                Learning & Growth
              </div>
              <h1 className="text-5xl md:text-8xl font-display font-bold text-gray-900 tracking-tight">
                Education <span className="text-indigo-600">Services</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-500 mt-4 font-medium">Access schools, digital resources, and admission portals across India.</p>
            </div>
          </div>
          
          <div className="max-w-[1600px] mx-auto flex gap-4 mt-12 overflow-x-auto scrollbar-hide pb-4">
            {mainTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                className={clsx(
                  'px-8 py-4 rounded-2xl text-lg font-bold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  activeMainTab === tab ? 'bg-indigo-700 text-white shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full px-12 py-16 flex-1 flex flex-col">
        <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {activeMainTab === 'Institutions' && (
            <motion.div 
              key="institutions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-2">
                {institutionTypes.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInstTab(tab)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border',
                      activeInstTab.id === tab.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'
                    )}
                  >
                    {tab.id}
                  </button>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-4 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 min-h-[50vh] relative flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-sm">Nearby {activeInstTab.id}</span>
                  </div>
                  <button 
                    onClick={openInGoogleMaps}
                    disabled={!userLocation}
                    className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    <Navigation className="w-4 h-4" /> Open App
                  </button>
                </div>
                
                <div className="flex-0 relative bg-gray-100">
                  {!navigator.onLine ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 p-4 text-center">
                      <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-bold text-gray-700">Map Unavailable</p>
                      <p className="text-xs text-gray-500 mt-1">Please connect to the internet to view nearby institutions.</p>
                    </div>
                  ) : loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                      <p className="text-xs text-gray-600 font-medium">Locating you...</p>
                    </div>
                  ) : userLocation ? (
                    <iframe 
                      title={`Nearby ${activeInstTab.id}`}
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      className="absolute inset-0"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(activeInstTab.query)}+near+${userLocation.lat},${userLocation.lng}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    ></iframe>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Resources' && (
            <motion.div 
              key="resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pb-4"
            >
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <Library className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-indigo-900">Digital Learning</h3>
                  <p className="text-xs text-indigo-700 mt-1">Access free courses, textbooks, and scholarships provided by the government.</p>
                </div>
              </div>

              <div className="grid gap-3">
                {resourcesList.map((resource, idx) => (
                  <a 
                    key={idx} 
                    href={resource.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow block group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{resource.name}</h4>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{resource.desc}</p>
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          {activeMainTab === 'Admissions' && (
            <motion.div 
              key="admissions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pb-4"
            >
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <GraduationCap className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-indigo-900">Admissions & Exams</h3>
                  <p className="text-xs text-indigo-700 mt-1">Official portals for entrance exams, university guidelines, and board results.</p>
                </div>
              </div>

              <div className="grid gap-3">
                {admissionsList.map((item, idx) => (
                  <a 
                    key={idx} 
                    href={item.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow block group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>
  );
}
