import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Heart, Edit2, Plus, Trash2, ArrowLeft, Save, ShieldAlert, LogOut, Fingerprint, Info, Cloud, CloudOff, Loader2, Globe, Moon, Star, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { isBiometricsSupported, registerBiometrics } from '../utils/biometrics';
import SecurityGuideModal from '../components/SecurityGuideModal';
import { syncToCloud, fetchFromCloud } from '../utils/cloudSync';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Profile() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [isSecurityGuideOpen, setIsSecurityGuideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [profile, setProfile] = useState({
    name: '',
    bloodGroup: '',
    dob: '',
    allergies: '',
    conditions: '',
    medications: '',
    contacts: [{ name: '', relation: '', phone: '' }],
    settings: {
      autoLocationSharing: true,
      sharingMethod: 'SMS', // 'SMS' or 'WhatsApp'
      appLockEnabled: false,
      primaryContactIndex: 0
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    isBiometricsSupported().then(setBiometricsAvailable);
    
    const loadData = async () => {
      // Try fetching from secure cloud first
      const cloudProfile = await fetchFromCloud('profile');
      if (cloudProfile) {
        setProfile(cloudProfile);
        // Also update local storage as a fallback
        localStorage.setItem('userProfile', JSON.stringify(cloudProfile));
        return;
      }

      // Fallback to local storage
      const saved = localStorage.getItem('userProfile');
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        // Check if old Medical ID exists and migrate
        const oldMedicalId = localStorage.getItem('medicalId');
        if (oldMedicalId) {
          const parsed = JSON.parse(oldMedicalId);
          setProfile(prev => ({
            ...prev,
            name: parsed.name || '',
            bloodGroup: parsed.bloodGroup || '',
            allergies: parsed.allergies || '',
            conditions: parsed.conditions || '',
            medications: parsed.medications || '',
            contacts: parsed.emergencyContact ? [{ name: 'Emergency Contact', relation: 'Primary', phone: parsed.emergencyContact }] : [{ name: '', relation: '', phone: '' }]
          }));
        } else {
          setIsEditing(true);
        }
      }
    };

    loadData();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!profile.name.trim()) newErrors.name = 'Name is required';
    
    profile.contacts.forEach((contact, idx) => {
      if (!contact.name.trim()) newErrors[`contact_name_${idx}`] = 'Contact name required';
      if (!contact.phone.trim()) {
        newErrors[`contact_phone_${idx}`] = 'Phone number required';
      } else if (!/^\+?[\d\s-]{10,}$/.test(contact.phone.trim())) {
        newErrors[`contact_phone_${idx}`] = 'Invalid phone number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const autoSaveSettings = async (updatedProfile: typeof profile) => {
    setProfile(updatedProfile);
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // Sync to cloud in background
    syncToCloud(updatedProfile, 'profile').then(success => {
      if (success) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
      }
    });
  };

  const handleSave = async () => {
    if (validate()) {
      setIsSyncing(true);
      setSyncStatus('idle');
      
      // Save locally first for offline support
      localStorage.setItem('userProfile', JSON.stringify(profile));
      
      // Sync to secure cloud
      const success = await syncToCloud(profile, 'profile');
      
      setIsSyncing(false);
      if (success) {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
      }
      
      setIsEditing(false);
    }
  };

  const addContact = () => {
    setProfile({
      ...profile,
      contacts: [...profile.contacts, { name: '', relation: '', phone: '' }]
    });
  };

  const removeContact = (index: number) => {
    const newContacts = [...profile.contacts];
    newContacts.splice(index, 1);
    setProfile({ ...profile, contacts: newContacts });
  };

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...profile.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setProfile({ ...profile, contacts: newContacts });
  };

  const handleLogout = () => {
    localStorage.removeItem('userProfile');
    localStorage.removeItem('medicalId');
    localStorage.removeItem('cloud_user_id');
    localStorage.removeItem('cloud_encryption_key');
    navigate('/');
  };

  return (
    <div className="min-h-full bg-[#fcfcfc] dark:bg-gray-900 pb-24 font-sans transition-colors duration-200">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-20 pb-12 px-12 transition-colors duration-200">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex items-center gap-6">
              <button onClick={() => navigate(-1)} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-90">
                <ArrowLeft className="w-8 h-8 text-gray-800 dark:text-gray-200" />
              </button>
              <div>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                  <User className="w-4 h-4" />
                  Account Settings
                </div>
                <h1 className="text-5xl md:text-8xl font-display font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-6">
                  My <span className="text-blue-600 dark:text-blue-500">Profile</span>
                  {syncStatus === 'success' && <Cloud className="w-10 h-10 text-green-500" />}
                </h1>
                <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mt-4 font-medium">Manage your emergency contacts and medical information.</p>
              </div>
            </div>
            <div className="flex gap-4">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95">
                  <Edit2 className="w-6 h-6" />
                  Edit Profile
                </button>
              ) : (
                <button onClick={handleSave} disabled={isSyncing} className="flex items-center gap-3 bg-green-600 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl shadow-green-100 dark:shadow-none hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">
                  {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-12 py-16">
        <div className="max-w-[1600px] mx-auto space-y-12">
        {/* Personal Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-10">
            <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Personal Details</h2>
          </div>
          
          {isEditing ? (
            <div className="space-y-8">
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={profile.name} 
                  onChange={e => setProfile({...profile, name: e.target.value})} 
                  className={`w-full bg-gray-50 dark:bg-gray-900 border ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`} 
                />
                {errors.name && <p className="text-sm text-red-500 mt-2 font-medium">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Blood Group</label>
                  <select value={profile.bloodGroup} onChange={e => setProfile({...profile, bloodGroup: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option value="">Select...</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Date of Birth</label>
                  <input type="date" value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-2">Full Name</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.name || 'Not specified'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-2">Blood Group</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-500">{profile.bloodGroup || 'Not specified'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-2">Date of Birth</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{profile.dob || 'Not specified'}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Emergency Contacts */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <Phone className="w-10 h-10 text-green-600 dark:text-green-400" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Emergency Contacts</h2>
            </div>
            {isEditing && (
              <button onClick={addContact} aria-label="Add emergency contact" className="text-lg font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all">
                <Plus className="w-6 h-6" /> Add New Contact
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {profile.contacts.map((contact, idx) => (
              <div key={idx} className="relative bg-gray-50 dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                {isEditing ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Contact {idx + 1}</span>
                      {profile.contacts.length > 1 && (
                        <button onClick={() => removeContact(idx)} aria-label="Remove emergency contact" className="text-red-600 dark:text-red-400 p-3 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
                          <Trash2 className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Full Name" 
                        aria-label="Contact Name" 
                        value={contact.name} 
                        onChange={e => updateContact(idx, 'name', e.target.value)} 
                        className={`w-full bg-white dark:bg-gray-800 border ${errors[`contact_name_${idx}`] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-2xl py-4 px-6 text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`} 
                      />
                      {errors[`contact_name_${idx}`] && <p className="text-sm text-red-500 mt-2 font-medium">{errors[`contact_name_${idx}`]}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Relation (e.g. Father)" aria-label="Contact Relation" value={contact.relation} onChange={e => updateContact(idx, 'relation', e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 px-6 text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <div>
                        <input 
                          type="tel" 
                          placeholder="Phone Number" 
                          aria-label="Contact Phone Number" 
                          value={contact.phone} 
                          onChange={e => updateContact(idx, 'phone', e.target.value)} 
                          className={`w-full bg-white dark:bg-gray-800 border ${errors[`contact_phone_${idx}`] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-2xl py-4 px-6 text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`} 
                        />
                        {errors[`contact_phone_${idx}`] && <p className="text-sm text-red-500 mt-2 font-medium">{errors[`contact_phone_${idx}`]}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{contact.name || 'Unnamed Contact'}</div>
                      <div className="text-lg text-gray-500 dark:text-gray-400 font-medium">{contact.relation || 'Relation not specified'}</div>
                    </div>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`} className="bg-green-600 text-white p-5 rounded-3xl shadow-xl shadow-green-100 dark:shadow-none active:scale-90 transition-all hover:bg-green-700">
                        <Phone className="w-8 h-8" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!isEditing && profile.contacts.length === 0 && (
              <div className="text-xl text-gray-500 dark:text-gray-400 italic py-10 text-center col-span-full bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">No emergency contacts added.</div>
            )}
          </div>
        </motion.div>

        {/* Medical Information */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-10">
            <Heart className="w-10 h-10 text-red-600 dark:text-red-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Medical Information</h2>
          </div>

          {isEditing ? (
            <div className="space-y-8">
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Allergies</label>
                <textarea value={profile.allergies} onChange={e => setProfile({...profile, allergies: e.target.value})} placeholder="e.g., Peanuts, Penicillin" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Pre-existing Conditions</label>
                <textarea value={profile.conditions} onChange={e => setProfile({...profile, conditions: e.target.value})} placeholder="e.g., Asthma, Diabetes" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider">Current Medications</label>
                <textarea value={profile.medications} onChange={e => setProfile({...profile, medications: e.target.value})} placeholder="e.g., Inhaler, Insulin" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"></textarea>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-3">Allergies</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">{profile.allergies || 'None reported'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-3">Pre-existing Conditions</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">{profile.conditions || 'None reported'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-3">Current Medications</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white leading-relaxed">{profile.medications || 'None reported'}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Safety Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <ShieldAlert className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Safety Settings</h2>
            </div>
            <button 
              onClick={() => setIsSecurityGuideOpen(true)}
              className="text-purple-600 dark:text-purple-400 p-3 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-full transition-colors"
              aria-label="Security Guide"
            >
              <Info className="w-8 h-8" />
            </button>
          </div>

          <div className="space-y-10">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
              <div className="max-w-2xl">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Auto Location Sharing during Emergencies</div>
                <div className="text-lg text-gray-500 dark:text-gray-400 font-medium">Automatically share your real-time location when calling emergency services for faster response.</div>
              </div>
              <button 
                onClick={() => {
                  const updatedProfile = {
                    ...profile,
                    settings: {
                      ...profile.settings,
                      autoLocationSharing: !profile.settings.autoLocationSharing
                    }
                  };
                  autoSaveSettings(updatedProfile);
                }}
                className={`w-20 h-10 rounded-full transition-all relative shadow-inner ${profile.settings?.autoLocationSharing ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-lg transition-all ${profile.settings?.autoLocationSharing ? 'right-1.5' : 'left-1.5'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <label className="text-xl font-bold text-gray-900 dark:text-white mb-4 block">Primary Emergency Contact</label>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">Select the contact to automatically share your location with during an emergency.</p>
                <select 
                  value={profile.settings?.primaryContactIndex ?? 0}
                  onChange={(e) => {
                    const updatedProfile = {
                      ...profile,
                      settings: {
                        ...profile.settings,
                        primaryContactIndex: parseInt(e.target.value)
                      }
                    };
                    autoSaveSettings(updatedProfile);
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  {profile.contacts.map((contact, idx) => (
                    <option key={idx} value={idx}>
                      {contact.name || `Contact ${idx + 1}`} {contact.relation ? `(${contact.relation})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <label className="text-xl font-bold text-gray-900 dark:text-white mb-4 block">Preferred Sharing Method</label>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">Choose how your emergency alerts are sent to your contacts.</p>
                <select 
                  value={profile.settings?.sharingMethod}
                  onChange={(e) => {
                    const updatedProfile = {
                      ...profile,
                      settings: {
                        ...profile.settings,
                        sharingMethod: e.target.value
                      }
                    };
                    autoSaveSettings(updatedProfile);
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  <option value="SMS">SMS Message</option>
                  <option value="WhatsApp">WhatsApp Messenger</option>
                </select>
              </div>

              {biometricsAvailable && (
                <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <Fingerprint className="w-8 h-8 text-purple-600 dark:text-purple-400" /> App Lock (Biometrics)
                    </div>
                    <button 
                      onClick={async () => {
                        const currentStatus = profile.settings?.appLockEnabled;
                        let newStatus = !currentStatus;
                        
                        if (newStatus) {
                          const result = await registerBiometrics();
                          if (!result.success) {
                            alert(result.error || "Failed to register biometrics. Please try again.");
                            return;
                          }
                        }
                        
                        const updatedProfile = {
                          ...profile, 
                          settings: {
                            ...profile.settings, 
                            appLockEnabled: newStatus
                          }
                        };
                        
                        autoSaveSettings(updatedProfile);
                      }}
                      className={`w-20 h-10 rounded-full transition-all relative shadow-inner ${profile.settings?.appLockEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full shadow-lg transition-all ${profile.settings?.appLockEnabled ? 'right-1.5' : 'left-1.5'}`} />
                    </button>
                  </div>
                  <p className="text-lg text-gray-500 dark:text-gray-400 font-medium mb-6">Require fingerprint or face recognition to open the application for enhanced privacy.</p>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setIsSecurityGuideOpen(true)} 
                      className="text-lg text-purple-600 dark:text-purple-400 font-bold hover:underline transition-all"
                    >
                      View Setup Guide
                    </button>
                    {window.self !== window.top && (
                      <span className="text-sm text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/50">
                        Simulated in Preview
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* App Preferences */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-10">
            <Globe className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">App Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
              <label className="text-xl font-bold text-gray-900 dark:text-white mb-4 block flex items-center gap-3">
                <Globe className="w-6 h-6 text-gray-500 dark:text-gray-400" /> Display Language
              </label>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">Select your preferred language for the interface.</p>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="en">English (US)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
              <label className="text-xl font-bold text-gray-900 dark:text-white mb-4 block flex items-center gap-3">
                <Moon className="w-6 h-6 text-gray-500 dark:text-gray-400" /> App Theme
              </label>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">Choose your preferred visual theme.</p>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-5 px-6 text-xl font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="system">System Default</option>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Feedback & Support */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-12 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-10">
            <Star className="w-10 h-10 text-yellow-500 fill-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback & Support</h2>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Help Us Improve</h3>
              <p className="text-lg text-gray-500 dark:text-gray-400">Share your suggestions or report issues to help us make the Emergency Portal better for everyone.</p>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-feedback'))}
              className="w-full md:w-auto px-8 py-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 rounded-2xl font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-all active:scale-95 border border-yellow-100 dark:border-yellow-900/50 flex items-center justify-center gap-3 whitespace-nowrap text-lg"
            >
              <MessageSquare className="w-6 h-6" />
              Send Feedback
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-6">
          {isEditing && (
            <button onClick={handleSave} disabled={isSyncing} aria-label="Save Profile" className="flex-1 bg-green-600 text-white font-bold py-6 rounded-2xl shadow-2xl shadow-green-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-4 text-2xl hover:bg-green-700 disabled:opacity-70">
              {isSyncing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
              {isSyncing ? 'Syncing to Cloud...' : 'Save Profile Settings'}
            </button>
          )}

          {!isEditing && (
            <button onClick={handleLogout} aria-label="Logout" className="flex-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 font-bold py-6 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-4 text-2xl hover:bg-red-100 dark:hover:bg-red-900/50">
              <LogOut className="w-8 h-8" /> Logout & Clear Local Data
            </button>
          )}
        </div>
      </div>

      <SecurityGuideModal 
        isOpen={isSecurityGuideOpen} 
        onClose={() => setIsSecurityGuideOpen(false)} 
      />
    </div>
  </div>
  );
}
