/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CustomerWithRetention, Language, Visit, PREDEFINED_SERVICES } from './types';
import { TRANSLATIONS, translateName, translateServiceName, translateCategory, translateSkills } from './translations';
import RegistrationForm from './components/RegistrationForm';
import CheckInModal from './components/CheckInModal';
import ClientDashboard from './components/ClientDashboard';
import AdminAnalytics from './components/AdminAnalytics';
import KonjoLogo from './components/KonjoLogo';
import BirthdayWishModal from './components/BirthdayWishModal';
// @ts-expect-error - Vite handles jpg asset loading, TS bypass
import salonInterior from './assets/images/luxury_beauty_salon_1781874528973.jpg';
// @ts-expect-error - Vite handles jpg asset loading, TS bypass
import salonVector from './assets/images/salon_vector_1781800194768.jpg';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './lib/firebase';
import { classifyCustomer } from './lib/retention';
import { convertToEthiopian, formatEthiopianDate } from './lib/ethiopianCalendar';
import { 
  Users, 
  Search, 
  UserPlus, 
  Sparkles, 
  HelpCircle, 
  Smartphone, 
  Filter, 
  Award, 
  Plus, 
  ChevronRight, 
  Calendar,
  Layers,
  LineChart,
  UserCheck,
  Trash2,
  Settings,
  LogOut,
  Gift,
  ChevronDown,
  ChevronUp,
  Scissors
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [rawCustomers, setRawCustomers] = useState<any[]>([]);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [isBirthdayCollapsed, setIsBirthdayCollapsed] = useState(false);

  useEffect(() => {
    // Detect mobile and auto-collapse the birthday notification by default
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsBirthdayCollapsed(true);
    }
  }, []);

  // Real-time calculated reactive customers classification pipeline
  const customers = React.useMemo(() => {
    const curTime = new Date();
    return rawCustomers.map((c) => classifyCustomer(c, allVisits, curTime));
  }, [rawCustomers, allVisits]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'All' | 'Frequent' | 'Occasional' | 'At-Risk'>('All');
  const [activeTab, setActiveTab] = useState<'clients' | 'analytics' | 'settings'>('clients');
  const [showCheckInDrawer, setShowCheckInDrawer] = useState(false);
  const [preSelectedForVisit, setPreSelectedForVisit] = useState<CustomerWithRetention | null>(null);
  const [uiFeedback, setUiFeedback] = useState<string | null>(null);
  
  const [showRegPanel, setShowRegPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('kaldas_logged_in') === 'true';
  });
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | 'assistant' | null>(() => {
    return (localStorage.getItem('kaldas_user_role') as any) || null;
  });
  const [loggedInUser, setLoggedInUser] = useState<string>(() => {
    return localStorage.getItem('kaldas_logged_user') || '';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Staff registry state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'cashier' | 'assistant'>('cashier');
  const [staffPassword, setStaffPassword] = useState('');

  // Treatment Artists state
  const [artistsList, setArtistsList] = useState<any[]>([]);
  const [artistName, setArtistName] = useState('');
  const [artistSkills, setArtistSkills] = useState('');
  const [artistSpecialty, setArtistSpecialty] = useState<'Hair' | 'Nails' | 'Skin' | 'Massage' | 'General'>('General');

  // Services state
  const [salonServices, setSalonServices] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<'Hair' | 'Nails' | 'Skin' | 'Massage' | 'Product'>('Hair');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');
  const [editingServiceCategory, setEditingServiceCategory] = useState<'Hair' | 'Nails' | 'Skin' | 'Massage' | 'Product'>('Hair');
  const [editingServicePrice, setEditingServicePrice] = useState('');

  // Birthday wishes states
  const [birthdayWishes, setBirthdayWishes] = useState<any[]>([]);
  const [birthdayWishCustomer, setBirthdayWishCustomer] = useState<any | null>(null);
  const [bdaySearchQuery, setBdaySearchQuery] = useState('');

  const dict = TRANSLATIONS[lang];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'admin1' && (cleanPass === 'Admin1' || cleanPass === 'admin1')) {
      setIsLoggedIn(true);
      setUserRole('admin');
      setLoggedInUser('Admin1');
      localStorage.setItem('kaldas_logged_in', 'true');
      localStorage.setItem('kaldas_user_role', 'admin');
      localStorage.setItem('kaldas_logged_user', 'Admin1');
      setLoginError('');
      return;
    }

    const matched = staffList.find(s => s.name.trim().toLowerCase() === cleanUser && s.password === cleanPass);
    if (matched) {
      setIsLoggedIn(true);
      setUserRole(matched.role);
      setLoggedInUser(matched.name);
      localStorage.setItem('kaldas_logged_in', 'true');
      localStorage.setItem('kaldas_user_role', matched.role);
      localStorage.setItem('kaldas_logged_user', matched.name);
      setLoginError('');
    } else {
      setLoginError(lang === 'am' ? 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል!' : 'Incorrect username or password!');
    }
  };

  // Subscribe to staff members instantly for secure client-side login matching on load
  useEffect(() => {
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const staffData: any[] = [];
      snapshot.forEach((doc) => {
        staffData.push({ id: doc.id, ...doc.data() });
      });
      if (snapshot.empty) {
        const defaultStaff = [
          { id: 'staff_1', name: 'Helen Bekele', role: 'cashier', password: '123', created_at: new Date().toISOString() },
          { id: 'staff_2', name: 'Zenebe Tesfaye', role: 'assistant', password: '123', created_at: new Date().toISOString() }
        ];
        defaultStaff.forEach(async (member) => {
          await setDoc(doc(db, 'staff', member.id), member);
        });
      } else {
        setStaffList(staffData);
      }
    }, (err) => {
      console.error("Firestore Staff Subscribe Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'staff');
    });

    return () => unsubStaff();
  }, []);

  // Real-time synchronization listeners for operational collections
  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. Subscribe to Services (auto-seeding with premium defaults if empty)
    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesData: any[] = [];
      snapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() });
      });
      if (snapshot.empty) {
        PREDEFINED_SERVICES.forEach(async (srv) => {
          await setDoc(doc(db, 'services', srv.id), srv);
        });
      } else {
        setSalonServices(servicesData);
      }
    }, (err) => {
      console.error("Firestore Services Subscribe Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'services');
    });

    // 2. Subscribe to Visits
    const unsubVisits = onSnapshot(collection(db, 'visits'), (snapshot) => {
      const visitsData: any[] = [];
      snapshot.forEach((doc) => {
        visitsData.push({ id: doc.id, ...doc.data() });
      });
      setAllVisits(visitsData);
    }, (err) => {
      console.error("Firestore Visits Subscribe Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'visits');
    });

    // 3. Subscribe to Customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData: any[] = [];
      snapshot.forEach((doc) => {
        customersData.push({ id: doc.id, ...doc.data() });
      });
      setRawCustomers(customersData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Customers Subscribe Error:", err);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'customers');
    });

    // 4. Subscribe to Treatment Artists
    const unsubArtists = onSnapshot(collection(db, 'artists'), (snapshot) => {
      const artistsData: any[] = [];
      snapshot.forEach((doc) => {
        artistsData.push({ id: doc.id, ...doc.data() });
      });
      if (snapshot.empty) {
        const defaultArtists = [
          { id: 'art_1', name: 'Sara Daniel', skills: 'Balayage, Keratin, Chic Blowout', specialty: 'Hair', created_at: new Date().toISOString() },
          { id: 'art_2', name: 'Kidus Yohannes', skills: 'Gel Manicure, Acrylic extensions, Pedicare', specialty: 'Nails', created_at: new Date().toISOString() },
          { id: 'art_3', name: 'Martha Girma', skills: 'Swedish Silk Massage, Hydrafacial, Collagen Mask', specialty: 'Massage', created_at: new Date().toISOString() }
        ];
        defaultArtists.forEach(async (art) => {
          await setDoc(doc(db, 'artists', art.id), art);
        });
      } else {
        setArtistsList(artistsData);
      }
    }, (err) => {
      console.error("Firestore Artists Subscribe Error:", err);
      handleFirestoreError(err, OperationType.LIST, 'artists');
    });

    // 5. Subscribe to Birthday wishes campaign log
    const unsubWishes = onSnapshot(collection(db, 'birthday_wishes'), (snapshot) => {
      const wishesData: any[] = [];
      snapshot.forEach((doc) => {
        wishesData.push({ id: doc.id, ...doc.data() });
      });
      setBirthdayWishes(wishesData.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()));
    }, (err) => {
      console.error("Firestore Birthday Wishes Subscribe Error:", err);
    });

    return () => {
      unsubServices();
      unsubVisits();
      unsubCustomers();
      unsubArtists();
      unsubWishes();
    };
  }, [isLoggedIn]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    if (!staffName.trim() || !staffPassword.trim()) return;
    try {
      const newStaffRef = doc(collection(db, 'staff'));
      await setDoc(newStaffRef, {
        id: newStaffRef.id,
        name: staffName.trim(),
        role: staffRole,
        password: staffPassword.trim(),
        created_at: new Date().toISOString()
      });
      setStaffName('');
      setStaffPassword('');
    } catch (e) {
      console.error('Failed to register staff in Firestore:', e);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (e) {
      console.error('Failed to remove staff from Firestore:', e);
    }
  };

  const handleAddArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    if (!artistName.trim()) return;
    try {
      const newArtRef = doc(collection(db, 'artists'));
      await setDoc(newArtRef, {
        id: newArtRef.id,
        name: artistName.trim(),
        skills: '',
        specialty: 'General',
        created_at: new Date().toISOString()
      });
      setArtistName('');
      setArtistSkills('');
    } catch (e) {
      console.error('Failed to register artist in Firestore:', e);
    }
  };

  const handleDeleteArtist = async (id: string) => {
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳaria ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    try {
      await deleteDoc(doc(db, 'artists', id));
    } catch (e) {
      console.error('Failed to remove artist from Firestore:', e);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    if (!newServiceName.trim() || !newServicePrice) return;
    try {
      const newRef = doc(collection(db, 'services'));
      await setDoc(newRef, {
        id: newRef.id,
        name: newServiceName.trim(),
        category: newServiceCategory,
        defaultPrice: Number(newServicePrice)
      });
      setNewServiceName('');
      setNewServicePrice('');
    } catch (e) {
      console.error('Failed to add service to Firestore:', e);
    }
  };

  const handleSaveServiceEdit = async (id: string) => {
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    if (!editingServiceName.trim() || !editingServicePrice) return;
    try {
      await updateDoc(doc(db, 'services', id), {
        name: editingServiceName.trim(),
        category: editingServiceCategory,
        defaultPrice: Number(editingServicePrice)
      });
      setEditingServiceId(null);
    } catch (e) {
      console.error('Failed to edit service details in Firestore:', e);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (userRole !== 'admin') {
      alert(lang === 'am' ? 'የአስተዳዳሪ ፈቃድ ያስፈልጋል!' : 'Admin permission is required!');
      return;
    }
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (e) {
      console.error('Failed to delete service from Firestore:', e);
    }
  };

  const isBirthdayToday = (birthDateStr?: string) => {
    if (!birthDateStr) return false;
    const today = new Date();
    const birthDateLocalObj = new Date(birthDateStr);
    return birthDateLocalObj.getMonth() === today.getMonth() && birthDateLocalObj.getDate() === today.getDate();
  };

  const birthdayClients = customers.filter(c => isBirthdayToday(c.birth_date));

  // When a visitor logs in successfully or note changes occur, refresh our view
  const handleVisitLoggedSuccess = (updatedCustomer: CustomerWithRetention) => {
    const segmentLabel = updatedCustomer.retentionStatus === 'Frequent' ? (lang === 'am' ? 'ተደጋጋሚ' : 'Frequent') : updatedCustomer.retentionStatus === 'Occasional' ? (lang === 'am' ? 'ቋሚ / መካከለኛ' : 'Regular') : (lang === 'am' ? 'ክትትል የሚሻ' : 'Needs Care');
    setUiFeedback(lang === 'am' 
      ? `✨ የጉብኝቱ ምዝገባ ለ ${updatedCustomer.full_name} በተሳካ ሁኔታ ተጠናቋል! ደረጃው፦ ${segmentLabel}` 
      : `✨ Check-In visit registered beautifully for ${updatedCustomer.full_name}! Segment: ${segmentLabel}`
    );
    setSelectedCustomerId(updatedCustomer.id);
    setTimeout(() => setUiFeedback(null), 5000);
  };

  const handleRegisterSuccess = (newCustomer: CustomerWithRetention) => {
    setSelectedCustomerId(newCustomer.id);
    setUiFeedback(lang === 'am' 
      ? `✨ የደንበኛ መገለጫ ለ ${newCustomer.full_name} በትክክል ተመዝግቧል!` 
      : `✨ Premium profile registered successfully for ${newCustomer.full_name}!`
    );
    setTimeout(() => setUiFeedback(null), 4000);
  };

  const triggerDirectVisitLogging = (client: CustomerWithRetention) => {
    setPreSelectedForVisit(client);
    setShowCheckInDrawer(true);
  };

  const selectedClientObject = customers.find(c => c.id === selectedCustomerId) || null;

  // Filter pipeline
  const filteredCustomersList = customers.filter(c => {
    const matchesSearch = c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone_number.includes(searchQuery);
    
    if (segmentFilter === 'All') return matchesSearch;
    return matchesSearch && c.retentionStatus === segmentFilter;
  });

  if (!isLoggedIn) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 font-sans antialiased text-[#2D2D2D] selection:bg-[#E5D5C8] bg-cover bg-fixed bg-center relative overflow-hidden"
        style={{ backgroundImage: `url(${salonInterior})` }}
      >
        {/* Premium semi-translucent backdrop overlay to preserve vibrant colors of the photo while ensuring top-tier usability */}
        <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[3px] pointer-events-none z-0" />
        
        {/* Soft atmospheric background glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl opacity-30 z-0" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl opacity-20 z-0" />
        
        <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-8 md:p-12 border border-neutral-200/50 shadow-2xl max-w-md w-full shrink-0 space-y-8 relative z-10 animate-fade-in text-center">
          
          <div className="space-y-3">
            <div className="flex justify-center mb-1">
              <KonjoLogo className="w-32 h-32 text-neutral-900 drop-shadow-md" size={128} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Kaldas Beauty Salon</h1>
            <p className="text-[11px] text-neutral-400 font-extrabold uppercase tracking-widest">{lang === 'am' ? 'የአስተዳዳሪ ማረጋገጫ' : 'Administrative Access'}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">{lang === 'am' ? 'የተጠቃሚ ስም' : 'Username'}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-neutral-50/90 border border-neutral-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800 placeholder:text-neutral-350"
                placeholder="e.g. Admin1"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">{lang === 'am' ? 'የይለፍ ቃል' : 'Password'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-50/90 border border-neutral-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800 placeholder:text-neutral-355"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200/20 text-center animate-fade-in">
                ⚠️ {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full font-bold text-xs shadow-ios transition-all active:scale-95 text-center mt-3 block uppercase tracking-wide"
            >
              {lang === 'am' ? 'ግባ' : 'Login'}
            </button>
          </form>

          {/* Bilingual toggler on login card */}
          <div className="pt-4 border-t border-neutral-100 flex justify-center gap-2">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${lang === 'en' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-400'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${lang === 'am' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-400'}`}
            >
              አማ
            </button>
          </div>


        </div>

        {/* Custom Developer Credits in bottom right corner */}
        <div className="absolute bottom-4 right-4 z-10 text-white/90 text-[10px] md:text-xs font-semibold tracking-wide bg-neutral-950/50 backdrop-blur-md py-1.5 px-3.5 rounded-full border border-white/10 shadow-lg pointer-events-none select-none animate-fade-in">
          Design and developed by <span className="text-amber-300 font-bold tracking-wider">VIAVELA TECHNOLOGY</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans antialiased text-[#2D2D2D] flex flex-col selection:bg-[#E5D5C8] selection:text-[#5A5A40] bg-cover bg-fixed bg-center relative"
      style={{ backgroundImage: `url(${salonInterior})` }}
    >
      {/* Premium semi-translucent backdrop overlay to ensure flawless contrast and elite readability */}
      <div className="absolute inset-0 bg-[#FAF9F6]/45 backdrop-blur-[2px] pointer-events-none z-0" />
      
      {/* Dynamic top elegant confirmation banner */}
      {uiFeedback && (
        <div className="bg-[#5A5A40] text-[#FAF9F6] text-xs px-4 py-3 text-center font-medium animate-fade-in flex items-center justify-center gap-2 border-b border-[#E5D5C8] shadow-md sticky top-0 z-50">
          <Sparkles className="w-4 h-4 shrink-0 text-[#F9EBC7] animate-pulse" />
          <span>{uiFeedback}</span>
        </div>
      )}

      {/* Main Luxury Header Bar - Styled with iOS glassmorphic translucency and clean borders */}
      <header className="relative overflow-hidden backdrop-blur-md bg-white/70 border-b border-neutral-200/60 py-2.5 px-4 md:py-4 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 sticky top-0 z-30 shadow-ios">
        
        {/* Highlight Background Image for navigation - subtle and elegant */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-[0.14] mix-blend-overlay"
          style={{ backgroundImage: `url(${salonVector})` }}
        />

        {/* Top/First Line on Mobile, Left-aligned on Desktop */}
        <div className="relative z-10 flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
          {/* Salon Branding info - styled as a beautiful premium oval box with a blackish background and white font */}
          <div className="flex items-center gap-2.5 bg-neutral-900/95 text-white rounded-full py-1.5 px-4.5 md:py-2 md:px-6 shadow-ios-lg border border-neutral-800/80 shrink-0">
            <KonjoLogo size={32} className="ios-active-scale md:scale-110 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm md:text-base font-bold font-sans tracking-tight leading-none text-white">{dict.app_name}</h1>
                <span className="text-[7.5px] md:text-[8.5px] uppercase tracking-wider font-extrabold bg-white/15 text-neutral-200 border border-white/10 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  {dict.mgmt_suite}
                </span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-0.5 font-bold tracking-wide uppercase hidden xs:block">{dict.tagline}</p>
            </div>
          </div>

          {/* Language Toggle - Placed on the top row on mobile to save valuable vertical screen space */}
          <div className="flex md:hidden items-center gap-1 bg-neutral-100 border border-neutral-200/50 p-0.5 rounded-full shadow-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-full text-[8px] font-black transition-all ios-active-scale ${
                lang === 'en'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-900'
              }`}
              id="lang-toggler-en-mob"
            >
              EN
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-2 py-0.5 rounded-full text-[8px] font-black transition-all ios-active-scale ${
                lang === 'am'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-900'
              }`}
              id="lang-toggler-am-mob"
            >
              አማ
            </button>
          </div>
        </div>

        {/* Navigation Tabs - iOS Segments styled with soft kinetic compression */}
        <div className="relative z-10 flex items-center gap-0.5 bg-neutral-100 border border-neutral-200/50 p-0.5 md:p-1 rounded-full w-full md:w-auto">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 md:flex-initial px-2.5 md:px-5 py-1.5 md:py-2 rounded-full text-[11px] md:text-xs font-semibold flex items-center justify-center gap-1 md:gap-1.5 transition-all ios-active-scale whitespace-nowrap ${
              activeTab === 'clients'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            id="tab-client-profiles"
          >
            <Users className="w-3 md:w-3.5 h-3 md:h-3.5" />
            {dict.tab_clients}
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-initial px-2.5 md:px-5 py-1.5 md:py-2 rounded-full text-[11px] md:text-xs font-semibold flex items-center justify-center gap-1 md:gap-1.5 transition-all ios-active-scale whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            id="tab-admin-analytics"
          >
            <LineChart className="w-3 md:w-3.5 h-3 md:h-3.5" />
            {dict.tab_analytics}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:flex-initial px-2.5 md:px-5 py-1.5 md:py-2 rounded-full text-[11px] md:text-xs font-semibold flex items-center justify-center gap-1 md:gap-1.5 transition-all ios-active-scale whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-neutral-900 text-white shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/40'
            }`}
            id="tab-admin-settings"
          >
            <Settings className="w-3 md:w-3.5 h-3 md:h-3.5" />
            {lang === 'am' ? 'ቅንጅቶች' : 'Staff'}
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="relative z-10 flex items-center gap-2 w-full md:w-auto">
          
          {/* Language Toggle (Desktop Only) */}
          <div className="hidden md:flex items-center gap-1 bg-neutral-100 border border-neutral-200/50 p-1 rounded-full shadow-xs mr-2">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ios-active-scale ${
                lang === 'en'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-900'
              }`}
              id="lang-toggler-en"
            >
              EN
            </button>
            <button
              onClick={() => setLang('am')}
              className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ios-active-scale ${
                lang === 'am'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-900'
              }`}
              id="lang-toggler-am"
            >
              አማ
            </button>
          </div>

          <button
            onClick={() => {
              setPreSelectedForVisit(null);
              setShowCheckInDrawer(true);
            }}
            className="flex-1 md:flex-initial justify-center px-4 md:px-5 py-2 md:py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 font-medium text-[11px] md:text-xs rounded-full flex items-center gap-1.5 shadow-ios transition-all ios-active-scale whitespace-nowrap"
            id="btn-global-log-visit"
          >
            <UserCheck className="w-3.5 md:w-4 h-3.5 md:h-4 text-emerald-300" />
            <span>{dict.btn_log_visit}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('clients');
              setShowRegPanel(prev => !prev);
            }}
            className="flex-1 md:flex-initial justify-center px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[11px] md:text-xs font-semibold bg-neutral-100 text-neutral-850 hover:bg-neutral-200 border border-neutral-200/60 flex items-center gap-1.5 hover:shadow-xs transition-all ios-active-scale whitespace-nowrap"
            id="btn-toggle-reg"
          >
            <UserPlus className="w-3.5 md:w-4 h-3.5 md:h-4 text-neutral-600" />
            <span>{showRegPanel ? dict.btn_close_panel : dict.btn_new_client}</span>
          </button>

        </div>
      </header>

      {/* Main Workspace Frame container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {activeTab === 'clients' ? (
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Client directory search list */}
            {/* If NO customer is selected, spans full size lg:col-span-12, else spans lg:col-span-4 */}
            <div className={selectedCustomerId ? 'lg:col-span-4 space-y-6 animate-fade-in' : 'lg:col-span-12 space-y-6 animate-fade-in'}>
              
              {/* Robust Client Search Directory panel with global indicators */}
              <div className="bg-white rounded-[24px] border border-neutral-200/50 shadow-ios p-5 space-y-5">
                
                {/* Search field & filter segments side-by-side in one row */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={dict.search_placeholder}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-50 border border-neutral-200/60 rounded-full focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-medium text-neutral-800 placeholder:text-neutral-400"
                      id="directory-search-field"
                    />
                  </div>

                  <div className="relative min-w-[160px]">
                    <select
                      value={segmentFilter}
                      onChange={(e) => setSegmentFilter(e.target.value as any)}
                      className="w-full bg-neutral-50 border border-neutral-200/55 py-2.5 pl-4 pr-10 rounded-full text-xs font-bold text-neutral-800 focus:outline-none appearance-none cursor-pointer shadow-xs"
                    >
                      <option value="All">{dict.filter_all} ({customers.length})</option>
                      <option value="Frequent">🟢 {dict.filter_frequent} ({customers.filter(c => c.retentionStatus === 'Frequent').length})</option>
                      <option value="Occasional">🟡 {dict.filter_occasional} ({customers.filter(c => c.retentionStatus === 'Occasional').length})</option>
                      <option value="At-Risk">🔴 {dict.filter_at_risk} ({customers.filter(c => c.retentionStatus === 'At-Risk').length})</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Directory list of client profiles */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1" id="client-directory-scroller">
                  <span className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    {dict.resident_profiles} ({filteredCustomersList.length})
                  </span>

                  {loading ? (
                    <p className="text-[11px] text-neutral-400 text-center py-8">{dict.syncing_registers}</p>
                  ) : filteredCustomersList.length === 0 ? (
                    <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-neutral-200/50">
                      <p className="text-xs text-neutral-400 font-medium">{dict.no_customers_matched}</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSegmentFilter('All');
                        }}
                        className="text-[10px] text-neutral-700 hover:underline font-bold mt-2 uppercase tracking-wide"
                      >
                        {dict.reset_filters}
                      </button>
                    </div>
                  ) : (
                    filteredCustomersList.map((client) => {
                      const isSelected = client.id === selectedCustomerId;
                      
                      // Loyalty colors globally nested based on premium Apple color guidelines
                      let badgeStyle = 'bg-red-50 text-red-800 border-red-100';
                      let dotColor = 'bg-red-500';
                      if (client.retentionStatus === 'Frequent') {
                        badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                        dotColor = 'bg-emerald-500';
                      } else if (client.retentionStatus === 'Occasional') {
                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-100';
                        dotColor = 'bg-amber-500';
                      }

                      return (
                        <button
                          key={client.id}
                          onClick={() => setSelectedCustomerId(client.id)}
                          className={`w-full p-4 rounded-2xl text-left border flex items-center justify-between transition-all duration-200 group relative ios-active-scale ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-50 shadow-ios font-medium'
                              : 'border-neutral-200/60 hover:border-neutral-450 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {/* Color indicator badge globally nested next to the name */}
                            <span className={`w-3 h-3 rounded-full shrink-0 ${dotColor} border border-white shadow-xs`} title={`Retention Segment: ${client.retentionStatus}`} />
                            <div className="truncate">
                              <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-neutral-950 font-extrabold' : 'text-neutral-700 font-medium'}`}>
                                {client.full_name}
                              </h4>
                              <p className="text-[10px] text-neutral-400 font-mono tracking-wide">{client.phone_number}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-sm">
                            <span className={`text-[10px] uppercase tracking-wide font-extrabold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>
                              {client.retentionStatus === 'Frequent' ? dict.filter_frequent : client.retentionStatus === 'Occasional' ? dict.filter_occasional : dict.filter_at_risk}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:transform group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

              </div>

            </div>

            {/* Central Work Section: Scannable customer profile dashboard with chronology logging */}
            {selectedCustomerId && (
              <div className="lg:col-span-8 space-y-4 animate-fade-in">
                {/* Back button to go to full size list view directory representation */}
                <button
                  onClick={() => setSelectedCustomerId('')}
                  className="py-2 px-4.5 rounded-full text-xs font-semibold bg-white text-neutral-700 border border-neutral-200/80 flex items-center gap-1.5 hover:bg-neutral-50 shadow-xs transition-all ios-active-scale"
                  id="btn-back-to-directory"
                >
                  <span>←</span>
                  {lang === 'am' ? 'ወደ ደንበኞች ማውጫ ተመለስ' : 'Back to Clients Directory'}
                </button>
                <ClientDashboard 
                  customer={selectedClientObject} 
                  onLogVisitForCustomer={triggerDirectVisitLogging}
                  onRefreshTrigger={() => {}} 
                  lang={lang}
                  dict={dict}
                  allVisits={allVisits}
                  staffList={staffList}
                  artistsList={artistsList}
                />
              </div>
            )}

          </div>

        ) : activeTab === 'analytics' ? (
          
          // Analytical intelligence sheets panel
          <div className="animate-fade-in">
            <AdminAnalytics 
              lang={lang}
              dict={dict}
              customers={customers}
              allVisits={allVisits}
              salonServices={salonServices}
              staffList={staffList}
              artistsList={artistsList}
            />
          </div>

        ) : (
          
          // Profile Settings & Staff Register panel
          <div className="bg-white rounded-[24px] border border-neutral-200/50 shadow-ios p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-500" /> {lang === 'am' ? 'የሳሎን ቅንጅቶችና ሰራተኞች' : 'Salon Settings & Staff Management'}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-medium">{lang === 'am' ? 'የአስተዳዳሪ መለያ ይቆጣጠሩ እና ካሽየሮችን ያክሉ ወይም ይሰርዙ።' : 'Manage administrative profile controls and expand your staff directory.'}</p>
            </div>

            {/* Active User Info */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/50 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A89F91]">
                {userRole === 'admin' 
                  ? (lang === 'am' ? 'አክቲቭ የአስተዳዳሪ መለያ' : 'Active Admin Profile') 
                  : (lang === 'am' ? 'አክቲቭ የሰራተኛ መለያ' : 'Active Staff Profile')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="text-neutral-400 block">
                    {lang === 'am' ? 'ሙሉ ስም / የተጠቃሚ ስም:' : 'Name / Username:'}
                  </span>
                  <span className="font-bold text-neutral-800 capitalize">{loggedInUser || 'admin'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">
                    {lang === 'am' ? 'የሲስተም ድርሻ (Role):' : 'System Role / Tier:'}
                  </span>
                  <span className="font-bold text-neutral-800 capitalize bg-neutral-200/65 rounded-md px-2.5 py-0.5 inline-block mt-0.5 border border-neutral-300/30">
                    {userRole === 'admin' 
                      ? (lang === 'am' ? 'አስተዳዳሪ (Admin)' : 'Admin') 
                      : userRole === 'cashier' 
                        ? (lang === 'am' ? 'ካሽየር (Cashier)' : 'Cashier') 
                        : (lang === 'am' ? 'ረዳት (Assistant)' : 'Assistant')}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-200/40 flex justify-end">
                <button
                  onClick={() => {
                    setIsLoggedIn(false);
                    setUserRole(null);
                    setLoggedInUser('');
                    localStorage.removeItem('kaldas_logged_in');
                    localStorage.removeItem('kaldas_user_role');
                    localStorage.removeItem('kaldas_logged_user');
                  }}
                  className="px-4 py-1.5 bg-red-55 text-red-750 hover:bg-red-100 font-bold border border-red-200/40 text-[11px] rounded-full flex items-center gap-1 transition-all ios-active-scale"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {lang === 'am' ? 'ከሲስተሙ ውጣ (Logout)' : 'Logout of Session'}
                </button>
              </div>
            </div>

            {/* Staff Management section in Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A89F91] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-400" /> {lang === 'am' ? 'የሳሎን ካሽየሮችና ረዳቶች' : 'Salon Cashiers & Assistants'} ({staffList.length})
              </h3>

              {userRole === 'admin' ? (
                /* Staff Form */
                <form onSubmit={handleAddStaff} className="bg-white rounded-2xl border border-neutral-150 p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-neutral-850">{lang === 'am' ? 'አዲስ ሰራተኛ ጨምር' : 'Register New Staff Member'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'ሙሉ ስም' : 'Staff Full Name'}</label>
                      <input
                        type="text"
                        required
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="e.g. Sofia Vergara"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'የስራ ድርሻ (Role)' : 'Assigned Role'}</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-bold text-neutral-800"
                      >
                        <option value="cashier">{lang === 'am' ? 'ካሽየር (Cashier)' : 'Cashier'}</option>
                        <option value="assistant">{lang === 'am' ? 'ረዳት (Assistant)' : 'Assistant'}</option>
                        <option value="hair_artist">{lang === 'am' ? 'የፀጉር ባለሙያ (Hair Artist)' : 'Hair Artist'}</option>
                        <option value="nail_artist">{lang === 'am' ? 'የጥፍር ባለሙያ (Nail Artist)' : 'Nail Artist'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'ይለፍ ቃል (Password)' : 'Password'}</label>
                      <input
                        type="password"
                        required
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all ios-active-scale hover:shadow-xs animate-fade-in"
                    >
                      + {lang === 'am' ? 'አክል' : 'Add Staff'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-xs text-amber-800 font-medium flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'am' 
                      ? 'የሰራተኛ መለያዎችን ማስተዳደር ለአስተዳዳሪዎች (Admin) ብቻ የተፈቀደ ተግባር ነው።' 
                      : 'Staff credential configuration is restricted. Only system Administrators can register or modify active staff members.'}
                  </span>
                </div>
              )}

              {/* Staff table list */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-white">
                {staffList.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">{lang === 'am' ? 'ምንም የሰራተኛ መዝገብ የለም።' : 'No staff registered yet.'}</p>
                ) : (
                  staffList.map((member) => (
                    <div key={member.id} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-neutral-50/50">
                      <div>
                        <p className="font-bold text-neutral-850">{translateName(member.name, lang)}</p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">
                          {member.role === 'cashier' ? (lang === 'am' ? 'ካሽየር (Cashier)' : 'Cashier') :
                           member.role === 'assistant' ? (lang === 'am' ? 'ረዳት (Assistant)' : 'Assistant') :
                           member.role === 'hair_artist' ? (lang === 'am' ? 'የፀጉር ባለሙያ (Hair Artist)' : 'Hair Artist') :
                           (lang === 'am' ? 'የጥፍር ባለሙያ (Nail Artist)' : 'Nail Artist')}
                          {userRole === 'admin' && (
                            <span className="ml-2 font-mono lowercase opacity-75">({lang === 'am' ? 'የይለፍ ቃል' : 'password'}: {member.password})</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-neutral-400 font-mono">{member.created_at ? new Date(member.created_at).toLocaleDateString() : ''}</span>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ios-active-scale"
                            title="Delete staff"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {lang === 'am' ? 'ሰርዝ' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Treatment Artists & Service Providers Section */}
            <div className="space-y-4 pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A89F91] flex items-center gap-1.5 animate-fade-in">
                <Scissors className="w-4 h-4 text-neutral-400" /> {lang === 'am' ? 'የውበት ባለሙያዎችና ሰራተኞች (Treatment Artists)' : 'Service Providers & Treatment Artists'} ({artistsList.length})
              </h3>

              {userRole === 'admin' ? (
                /* Artist Form */
                <form onSubmit={handleAddArtist} className="bg-white rounded-2xl border border-neutral-150 p-4 space-y-3 shadow-xs animate-fade-in">
                  <h4 className="text-xs font-bold text-neutral-850">{lang === 'am' ? 'አዲስ የውበት ባለሙያ ጨምር' : 'Register New Treatment Artist / Provider'}</h4>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'ባለሙያ ሙሉ ስም' : 'Artist Full Name'}</label>
                      <input
                        type="text"
                        required
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="e.g. Mahlet Solomon"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all ios-active-scale whitespace-nowrap h-[34px]"
                    >
                      + {lang === 'am' ? 'ባለሙያ አክል' : 'Add Artist'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-xs text-amber-800 font-medium flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'am' 
                      ? 'የውበት ባለሙያዎችን መዝገብ ማስተዳደር ለአስተዳዳሪዎች (Admin) ብቻ የተፈቀደ ተግባር ነው።' 
                      : 'Treatment Artist directory configuration is restricted. Only system Administrators can register or modify active artists.'}
                  </span>
                </div>
              )}

              {/* Artists list table */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-white">
                {artistsList.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">{lang === 'am' ? 'ምንም የውበት ባለሙያ አልተመዘገበም።' : 'No treatment artists registered yet.'}</p>
                ) : (
                  artistsList.map((art) => (
                    <div key={art.id} className="p-3 px-4 flex items-center justify-between text-xs hover:bg-neutral-50/50">
                      <div>
                        <p className="font-bold text-neutral-850">{translateName(art.name, lang)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-neutral-400 font-mono">{art.created_at ? new Date(art.created_at).toLocaleDateString() : ''}</span>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteArtist(art.id)}
                            className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ios-active-scale"
                            title="Delete artist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {lang === 'am' ? 'ሰርዝ' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Services & Treatment Settings Section */}
            <div className="space-y-4 pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A89F91] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-neutral-400" /> {lang === 'am' ? 'የውበት አገልግሎቶችና ዋጋዎች' : 'Beauty Services & Treatments Settings'} ({salonServices.length})
              </h3>

              {userRole === 'admin' ? (
                /* Add Service Form */
                <form onSubmit={handleAddService} className="bg-white rounded-2xl border border-neutral-150 p-4 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-neutral-850">{lang === 'am' ? 'አዲስ የአገልግሎት አይነት ጨምር' : 'Add New Salon Treatment or Service'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'የአገልግሎት ስም' : 'Service Name'}</label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="e.g. Balayage Hair"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'ዘርፍ (Category)' : 'Treatment Category'}</label>
                      <select
                        value={newServiceCategory}
                        onChange={(e) => setNewServiceCategory(e.target.value as any)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-bold text-neutral-800"
                      >
                        <option value="Hair">{lang === 'am' ? 'ፀጉር (Hair)' : 'Hair'}</option>
                        <option value="Nails">{lang === 'am' ? 'ጥፍር (Nails)' : 'Nails'}</option>
                        <option value="Skin">{lang === 'am' ? 'ቆዳ (Skin)' : 'Skin'}</option>
                        <option value="Massage">{lang === 'am' ? 'ማሳጅ (Massage)' : 'Massage'}</option>
                        <option value="Product">{lang === 'am' ? 'የሽያጭ ምርት (Product)' : 'Product'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase mb-1">{lang === 'am' ? 'መደበኛ ዋጋ (ETB)' : 'Default Price (ETB)'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        placeholder="150.00"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-bold text-neutral-850"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all ios-active-scale hover:shadow-xs"
                    >
                      + {lang === 'am' ? 'አገልግሎት ጨምር' : 'Add Treatment'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 text-xs text-amber-800 font-medium flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'am' 
                      ? 'የውበት አገልግሎቶችንና ዋጋዎችን ማሻሻል ለአስተዳዳሪዎች (Admin) ብቻ የተፈቀደ ተግባር ነው።' 
                      : 'Salon Treatment config is restricted. Only system Administrators can define, update, or delete catalog services and prices.'}
                  </span>
                </div>
              )}

              {/* Services List Table */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-white">
                {salonServices.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">{lang === 'am' ? 'ምንም የአገልግሎት መዝገብ የለም።' : 'No custom treatments registered yet.'}</p>
                ) : (
                  salonServices.map((srv) => {
                    const isEditing = editingServiceId === srv.id;
                    return (
                      <div key={srv.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-neutral-50/50">
                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 mr-3 items-end">
                            <div>
                              <input
                                type="text"
                                value={editingServiceName}
                                onChange={(e) => setEditingServiceName(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-300 rounded p-1 text-xs font-bold text-neutral-850 focus:outline-none"
                              />
                            </div>
                            <div>
                              <select
                                value={editingServiceCategory}
                                onChange={(e) => setEditingServiceCategory(e.target.value as any)}
                                className="w-full bg-neutral-55 border border-neutral-300 rounded p-1 text-xs font-bold text-neutral-800 focus:outline-none"
                              >
                                <option value="Hair">Hair</option>
                                <option value="Nails">Nails</option>
                                <option value="Skin">Skin</option>
                                <option value="Massage">Massage</option>
                                <option value="Product">Product</option>
                              </select>
                            </div>
                            <div>
                              <input
                                type="number"
                                value={editingServicePrice}
                                onChange={(e) => setEditingServicePrice(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-300 rounded p-1 text-xs font-bold text-neutral-850 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-neutral-850 flex items-center gap-1.5">
                              {translateServiceName(srv.id, srv.name, lang)}
                              <span className="text-[9px] uppercase font-black text-neutral-400 bg-neutral-50 border border-neutral-200/50 rounded-full px-1.5 py-0.5">{translateCategory(srv.category, lang)}</span>
                            </p>
                            <p className="text-neutral-400 text-[10.5px] mt-0.5 font-bold font-mono">{Number(srv.defaultPrice).toFixed(2)} ETB</p>
                          </div>
                        )}

                        {userRole === 'admin' && (
                          <div className="flex items-center gap-2 justify-end">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveServiceEdit(srv.id)}
                                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold transition-all"
                                >
                                  {lang === 'am' ? 'አስቀምጥ' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingServiceId(null)}
                                  className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-[10px] font-bold transition-all"
                                >
                                  {lang === 'am' ? 'ተው' : 'Cancel'}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingServiceId(srv.id);
                                    setEditingServiceName(srv.name);
                                    setEditingServiceCategory(srv.category as any);
                                    setEditingServicePrice(String(srv.defaultPrice));
                                  }}
                                  className="p-1 px-3 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-750 rounded-full text-[10px] font-bold transition-all"
                                >
                                  {lang === 'am' ? 'አስተካክል' : 'Edit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(srv.id)}
                                  className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {lang === 'am' ? 'ሰርዝ' : 'Delete'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Birthday Campaign & SMS Center (Admin Only) */}
            {userRole === 'admin' && (
              <div className="space-y-4 pt-6 border-t border-neutral-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#A89F91] flex items-center gap-1.5">
                    <span>🎂</span> {lang === 'am' ? 'የልደት በዓል ኤስኤምኤስ እና ዘመቻ ማዕከል' : 'Birthday Campaign & SMS Center'}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-1 font-medium">
                    {lang === 'am' ? 'ለደንበኞች የልደት ምኞት መልዕክቶችን እና የቅናሽ ኮዶችን ያስተላልፉ።' : 'Compose birthday wish texts, manage active customer promotions, and review logs.'}
                  </p>
                </div>

                {/* Send Wish to Any Client Search Section */}
                <div className="bg-neutral-50/50 rounded-2xl p-4 border border-neutral-200/50 space-y-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-neutral-850">
                    {lang === 'am' ? 'ለማንኛውም ደንበኛ የልደት ምኞት ይላኩ' : 'Send Birthday Wish to Any Customer'}
                  </h4>
                  
                  {/* Small customer picker */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={bdaySearchQuery}
                        onChange={(e) => setBdaySearchQuery(e.target.value)}
                        placeholder={lang === 'am' ? 'ደንበኛ በስም ወይም ስልክ ፈልግ...' : 'Search customer by name or phone...'}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-800"
                        id="birthday-campaign-client-search"
                      />
                    </div>
                  </div>

                  {/* List of matching customers who have a birthday */}
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 bg-white p-2.5 rounded-xl border border-neutral-200/40">
                    {(() => {
                      const matched = customers.filter(c => {
                        const nameMatch = c.full_name.toLowerCase().includes(bdaySearchQuery.toLowerCase());
                        const phoneMatch = c.phone_number.includes(bdaySearchQuery);
                        return (nameMatch || phoneMatch) && c.birth_date;
                      });

                      if (matched.length === 0) {
                        return (
                          <p className="text-[11px] text-neutral-400 text-center py-4">
                            {lang === 'am' ? 'ምንም ደንበኛ (የልደት ቀን ያለው) አልተገኘም።' : 'No customers with birthday found.'}
                          </p>
                        );
                      }

                      return matched.slice(0, 10).map(c => {
                        const etBirthday = c.birth_date ? convertToEthiopian(c.birth_date) : null;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg text-xs">
                            <div>
                              <span className="font-bold text-neutral-850">{c.full_name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono ml-2">({c.phone_number})</span>
                              {c.birth_date && (
                                <span className="text-[10px] text-amber-700 font-bold ml-2 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/60 inline-flex items-center gap-0.5">
                                  🎂 {c.birth_date} {etBirthday ? `(${formatEthiopianDate(etBirthday, lang)})` : ''}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setBirthdayWishCustomer(c)}
                              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ios-active-scale"
                            >
                              <span>✉️</span>
                              <span>{lang === 'am' ? 'ምኞት ላክ' : 'Compose Wish'}</span>
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Sent Wishes Archive / History Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-850 flex items-center gap-1">
                    <span>📜</span> {lang === 'am' ? 'የተላኩ መልዕክቶች ታሪክ' : 'Sent Wishes History Log'} ({birthdayWishes.length})
                  </h4>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                    {birthdayWishes.length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-6">
                        {lang === 'am' ? 'እስካሁን ምንም የተላከ የልደት ምኞት የለም።' : 'No birthday wishes sent or logged yet.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'ደንበኛ' : 'Recipient'}</th>
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'ስልክ' : 'Phone'}</th>
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'ጉርሻ / ስጦታ' : 'Campaign Offer'}</th>
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'መልዕክት' : 'Message Body'}</th>
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'ቀን' : 'Sent Date'}</th>
                              <th className="py-2.5 px-4 font-extrabold">{lang === 'am' ? 'በማን' : 'Sender'}</th>
                              <th className="py-2.5 px-4 font-extrabold text-center">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {birthdayWishes.slice(0, 10).map((w) => (
                              <tr key={w.id} className="hover:bg-neutral-50/40 text-[11px] font-medium text-neutral-750">
                                <td className="py-2.5 px-4 font-bold text-neutral-850">{w.customer_name}</td>
                                <td className="py-2.5 px-4 font-mono text-[10px] text-neutral-500">{w.customer_phone}</td>
                                <td className="py-2.5 px-4">
                                  {w.offer_type === 'none' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[9px] font-black border border-neutral-200/50 uppercase">
                                      {lang === 'am' ? 'ምኞት ብቻ' : 'Wish Only'}
                                    </span>
                                  ) : w.offer_type === '50_percent' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px] font-black border border-amber-200/30 uppercase">
                                      {lang === 'am' ? 'የ 50% ቅናሽ' : '50% Off'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9px] font-black border border-emerald-200/30 uppercase">
                                      🎉 {lang === 'am' ? 'ነጻ አገልግሎት' : 'Free Service'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 max-w-[180px] truncate" title={w.message_text}>
                                  {w.message_text}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[10px] text-neutral-400">
                                  {new Date(w.sent_at).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 px-4 text-neutral-600 font-bold">{w.sent_by}</td>
                                <td className="py-2.5 px-4 text-center">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full border border-neutral-200/40" title="Draft simulation logged successfully inside Firestore">
                                    🟢 {lang === 'am' ? 'ተመዝግቧል' : 'Logged'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Floating Check-In & session capturing overlays drawer */}
      {showCheckInDrawer && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#2D2D2D]/40 backdrop-blur-xs z-40 animate-fade-in transition-opacity" 
            onClick={() => setShowCheckInDrawer(false)}
          />
          <CheckInModal 
            customers={customers} 
            preSelectedCustomer={preSelectedForVisit || selectedClientObject}
            onClose={() => {
              setShowCheckInDrawer(false);
              setPreSelectedForVisit(null);
            }} 
            onVisitLogged={(updatedCustomer) => {
              handleVisitLoggedSuccess(updatedCustomer);
            }}
            lang={lang}
            dict={dict}
            salonServices={salonServices}
            allVisits={allVisits}
            staffList={staffList}
            artistsList={artistsList}
          />
        </>
      )}

      {/* Floating Client Registration Overlay Modal */}
      {showRegPanel && (
        <RegistrationForm 
          existingCustomers={customers} 
          onRegisterSuccess={(newC) => {
            handleRegisterSuccess(newC);
            setShowRegPanel(false);
          }} 
          lang={lang}
          dict={dict}
          onClose={() => setShowRegPanel(false)}
        />
      )}

      {/* Floating Birthday notifications with premium collapsible states */}
      {birthdayClients.length > 0 && (
        isBirthdayCollapsed ? (
          <button
            onClick={() => setIsBirthdayCollapsed(false)}
            className="fixed bottom-6 right-6 z-40 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs p-3.5 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-400 group ios-active-scale animate-fade-in"
            title={lang === 'am' ? 'የልደት በዓላት አስታዋሽ' : 'Birthday Reminders'}
          >
            <span className="text-base select-none">🎂</span>
            <span className="bg-white text-amber-700 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
              {birthdayClients.length}
            </span>
          </button>
        ) : (
          <div className="fixed bottom-6 right-6 z-40 max-w-[calc(100vw-2rem)] w-80 bg-white border border-amber-200 rounded-[24px] p-4.5 shadow-ios-lg animate-fade-in space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                  <span className="text-sm">🎉</span>
                </div>
                <h4 className="text-xs font-black text-neutral-900 tracking-tight">
                  {lang === 'am' ? 'የዛሬ የልደት በዓላት! 🎂' : "Today's Birthdays! 🎂"} ({birthdayClients.length})
                </h4>
              </div>
              <button
                onClick={() => setIsBirthdayCollapsed(true)}
                className="p-1.5 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                title={lang === 'am' ? 'ደብቅ' : 'Minimize'}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-amber-100/60 overflow-hidden rounded-xl border border-amber-100 bg-amber-50/20 max-h-40 overflow-y-auto">
              {birthdayClients.map((client) => {
                const etBirthday = client.birth_date ? convertToEthiopian(client.birth_date) : null;
                return (
                  <div key={client.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-amber-100/20 transition-colors">
                    <div>
                      <span className="font-extrabold text-neutral-800 block leading-tight">{client.full_name}</span>
                      {etBirthday && (
                        <span className="block text-[10px] text-amber-800 font-bold mt-0.5">
                          {formatEthiopianDate(etBirthday, lang)}
                        </span>
                      )}
                      <span className="block text-[9px] font-bold text-neutral-400 font-mono mt-0.5">{client.phone_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {client.retentionStatus === 'Frequent' && (
                        <span className="text-[8px] bg-emerald-50 text-emerald-800 border-emerald-100 border rounded-full px-2 py-0.5 uppercase font-medium tracking-wider select-none flex items-center gap-0.5">
                          🎁 {lang === 'am' ? 'ነጻ!' : 'Free!'}
                        </span>
                      )}
                      {userRole === 'admin' && (
                        <button
                          onClick={() => setBirthdayWishCustomer(client)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs ios-active-scale transition-all"
                          title={lang === 'am' ? 'መልዕክት ላክ' : 'Send SMS'}
                        >
                          ✉️ {lang === 'am' ? 'ምኞት' : 'Wish'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9.5px] text-[#A89F91] font-bold uppercase text-center tracking-wider">
              {lang === 'am' ? 'ልደታቸውን በመጠየቅ ደስታቸውን አብረዋቸው ያክብሩ!' : 'Celebrate on their visits!'}
            </p>
          </div>
        )
      )}

      {/* Premium Footer */}
      <footer className="relative z-10 bg-white/70 backdrop-blur-md border-t border-[#E5D5C8]/80 py-8 px-4 text-center mt-12 shadow-inner">
        <p className="text-xs text-[#A89F91] font-medium tracking-wide">
          {dict.app_name} • Bespoke CRM Luxury Suite © 2026. All Client Formulation Diaries Protected.
        </p>
      </footer>

      {birthdayWishCustomer && (
        <BirthdayWishModal
          customer={birthdayWishCustomer}
          lang={lang}
          onClose={() => setBirthdayWishCustomer(null)}
        />
      )}

    </div>
  );
}
