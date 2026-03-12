import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Loader2, Sparkles, Navigation, MessageSquare, Map, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSmartSearchContent } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import Markdown from 'react-markdown';

export default function SmartSearch() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setAiResponseText('');
    setPlaces([]);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    try {
      const data = await getSmartSearchContent(
        query, 
        userLocation?.lat, 
        userLocation?.lng
      );

      if (data.error === 'QUOTA_EXCEEDED') {
        setError(data.text);
        return;
      }

      if (data.text) {
        setAiResponseText(data.text);
      }
      
      if (data.places && data.places.length > 0) {
        setPlaces(data.places);
      } else if (!data.text) {
        setError('No results found.');
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[#fcfcfc] pb-24 font-sans">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-12 px-6 md:px-12">
        <div className="w-full max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex items-center gap-6">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9, backgroundColor: '#e0e7ff' }}
                onClick={() => navigate(-1)} 
                className="p-4 bg-gray-100 rounded-2xl transition-colors"
              >
                <ArrowLeft className="w-8 h-8 text-gray-800" />
              </motion.button>
              <div>
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4"
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  AI Intelligence
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 tracking-tight">
                  Smart <span className="text-indigo-600">Search</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-500 mt-4 font-medium">Ask any question or locate resources using advanced AI.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Search Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-100/50 border border-indigo-50 mb-10"
          >
            <div className="relative mb-4">
              <motion.div
                animate={loading ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <Search className={`w-6 h-6 ${loading ? 'text-indigo-500' : 'text-gray-400'}`} />
              </motion.div>
              <input 
                type="text" 
                placeholder="Ask anything (e.g., 'What to do in an earthquake?' or 'Find nearby hospitals')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-14 pr-4 text-lg font-medium focus:outline-none focus:border-indigo-300 focus:bg-white transition-all" 
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg ${
                isClicked 
                  ? 'bg-indigo-800 text-white shadow-indigo-300' 
                  : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              } disabled:opacity-70 disabled:hover:scale-100`}
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Loader2 className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ rotate: 15 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              )}
              {loading ? 'Analyzing...' : 'Ask AI Assistant'}
            </motion.button>
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-600 text-base font-medium p-4 bg-red-50 rounded-2xl border border-red-100 mb-8 flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5" />
              {error}
            </motion.div>
          )}

          <AnimatePresence>
            {(aiResponseText || places.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* AI Text Response */}
                {aiResponseText && (
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                      <motion.div 
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="p-2 bg-indigo-50 rounded-xl"
                      >
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">AI Response</h2>
                    </div>
                    <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed font-medium">
                      <Markdown>{aiResponseText}</Markdown>
                    </div>
                  </div>
                )}

                {/* Places Results */}
                {places.length > 0 && (
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                      <motion.div 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="p-2 bg-teal-50 rounded-xl"
                      >
                        <Map className="w-6 h-6 text-teal-600" />
                      </motion.div>
                      <h2 className="font-bold text-xl text-gray-900">Locations Found</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {places.map((place, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ scale: 1.01, backgroundColor: '#f8fafc' }}
                          className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-start justify-between gap-4 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <motion.div 
                              whileHover={{ scale: 1.2, rotate: 15 }}
                              className="p-3 bg-white rounded-full shadow-sm mt-1"
                            >
                              <MapPin className="w-5 h-5 text-red-500" />
                            </motion.div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{place.title}</h3>
                              {place.address && (
                                <p className="text-sm text-gray-500 mt-1 font-medium">{place.address}</p>
                              )}
                              {place.snippets && place.snippets.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {place.snippets.map((snippet: any, sIdx: number) => (
                                    <p key={sIdx} className="text-sm text-gray-600 italic bg-white p-3 rounded-xl border border-gray-100">
                                      "{snippet.text}"
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {place.uri && (
                            <motion.a 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9, backgroundColor: '#3730a3' }}
                              href={place.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-shrink-0 bg-indigo-600 text-white p-4 rounded-2xl shadow-md hover:bg-indigo-700 transition-colors"
                            >
                              <Navigation className="w-5 h-5" />
                            </motion.a>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
