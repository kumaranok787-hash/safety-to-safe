import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'te';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'home': 'Home',
    'health': 'Health',
    'education': 'Education',
    'safety': 'Women Safety',
    'police': 'Police',
    'profile': 'Profile',
    'search': 'Search',
    'smart_search': 'Smart Search',
    'settings': 'Settings',
    'theme': 'Theme',
    'language': 'Language',
    'search_placeholder': 'Search for anything nearby...',
    'finding_location': 'Finding your location...',
    'searching': 'Searching...',
    'no_results': 'No results found.',
    'get_directions': 'Get Directions',
    'home_title': 'YOUR SAFETY',
    'home_subtitle': 'OUR PRIORITY',
    'emergency_portal': 'Emergency Portal',
  },
  hi: {
    'home': 'होम',
    'health': 'स्वास्थ्य',
    'education': 'शिक्षा',
    'safety': 'महिला सुरक्षा',
    'police': 'पुलिस',
    'profile': 'प्रोफ़ाइल',
    'search': 'खोजें',
    'smart_search': 'स्मार्ट खोज',
    'settings': 'सेटिंग्स',
    'theme': 'थीम',
    'language': 'भाषा',
    'search_placeholder': 'आसपास कुछ भी खोजें...',
    'finding_location': 'आपका स्थान खोजा जा रहा है...',
    'searching': 'खोजा जा रहा है...',
    'no_results': 'कोई परिणाम नहीं मिला।',
    'get_directions': 'दिशा-निर्देश प्राप्त करें',
    'home_title': 'आपकी सुरक्षा',
    'home_subtitle': 'हमारी प्राथमिकता',
    'emergency_portal': 'आपातकालीन पोर्टल',
  },
  te: {
    'home': 'హోమ్',
    'health': 'ఆరోగ్యం',
    'education': 'విద్య',
    'safety': 'మహిళా భద్రత',
    'police': 'పోలీస్',
    'profile': 'ప్రొఫైల్',
    'search': 'శోధన',
    'smart_search': 'స్మార్ట్ శోధన',
    'settings': 'సెట్టింగులు',
    'theme': 'థీమ్',
    'language': 'భాష',
    'search_placeholder': 'సమీపంలో దేనినైనా శోధించండి...',
    'finding_location': 'మీ స్థానాన్ని కనుగొంటున్నాము...',
    'searching': 'వెతుకుతోంది...',
    'no_results': 'ఫలితాలు కనుగొనబడలేదు.',
    'get_directions': 'దిశలను పొందండి',
    'home_title': 'మీ భద్రత',
    'home_subtitle': 'మా ప్రాధాన్యత',
    'emergency_portal': 'అత్యవసర పోర్టల్',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('language') as Language) || 'en'
  );

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
