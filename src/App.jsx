import React, { useState, useEffect, createContext, useContext, useMemo, useRef, useCallback, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, addDoc, deleteDoc, updateDoc, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './firebase-config.js';
import * as XLSX from 'xlsx';

// Función helper para actualizar datos en localStorage
const refreshLocalStorageData = (collectionName, setData, selectedDate, isTimeScoped) => {
        const storageKey = `nebula-${collectionName}`;
        const storedData = localStorage.getItem(storageKey);
        let allData = storedData ? JSON.parse(storedData) : [];

        if (isTimeScoped) {
            const startOfMonth = new Date(selectedDate.year, selectedDate.month, 1);
            const endOfMonth = new Date(selectedDate.year, selectedDate.month + 1, 0, 23, 59, 59);
            allData = allData.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate >= startOfMonth && itemDate <= endOfMonth;
            });
        }


        setData(allData);
    };

// --- ÍCONOS (SVG) ---
const icons = {
  dashboard: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  ingresos: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
  gastos: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  deudas: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10l7-5 7 5v11H5zM9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5"/></svg>,
  inversiones: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
  metas: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  settings: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.12l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1 0-2.12l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  sun: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  moon: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  trash: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
  edit: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  calendar: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  repeat: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.6v-2.6c0-3.3 2.7-6 6-6h12"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.4v2.6c0 3.3-2.7 6-6 6H3"/></svg>,
  eye: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>,
  filter: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  chevronLeft: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  chevronRight: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  info: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  warning: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  gripVertical: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>,
  google: (props) => <svg {...props} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4682 7.36364H9V10.845H13.8436C13.635 11.97,13.0009 12.9232,12.0477 13.5614V15.8195H14.9564C16.6582 14.2527,17.64 11.9455,17.64 9.20455Z" fill="#4285F4"/><path d="M9 18C11.43 18,13.4673 17.1941,14.9564 15.8195L12.0477 13.5614C11.2418 14.1,10.2109 14.4205,9 14.4205C6.48 14.4205,4.36364 12.6805,3.65182 10.4386H0.717273V12.7805C2.25818 15.795,5.36182 18,9 18Z" fill="#34A853"/><path d="M3.65182 10.4386C3.45455 9.835,3.34091 9.19682,3.34091 8.525C3.34091 7.85318,3.45455 7.215,3.65182 6.61136V4.26955H0.717273C0.258182 5.25,0 6.35318,0 7.525C0 8.69682,0.258182 9.79955,0.717273 10.7805L3.65182 10.4386Z" fill="#FBBC05"/><path d="M9 3.57955C10.3214 3.57955,11.5077 4.03864,12.4405 4.935L15.0218 2.35455C13.4673 0.893636,11.43 0,9 0C5.36182 0,2.25818 2.205,0.717273 5.21955L3.65182 7.56136C4.36364 5.31955,6.48 3.57955,9 3.57955Z" fill="#EA4335"/></svg>,
};

// --- HELPERS Y CONFIG ---
const formatCurrency = (number = 0, targetCurrency = 'ARS', dolarMepRate = 1) => {
    try {
        // Validación de entrada más estricta
        if (typeof number !== 'number' || isNaN(number) || !isFinite(number)) {
            console.warn('formatCurrency - Número inválido:', number);
            return '$ 0,00';
        }

        // Protección contra valores extremos
        if (number < 0 || number > 999999999999) {
            console.warn('formatCurrency - Número fuera de rango:', number);
            return '$ 0,00';
        }

        // Solo multiplicar por dolarMepRate si la moneda no es ARS
        const finalAmount = targetCurrency === 'ARS' ? number : number * Math.max(0, dolarMepRate);

        const formattedNumber = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: targetCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(finalAmount);

        return formattedNumber;
    } catch (error) {
        console.error('Error en formatCurrency:', error);
        return '$ 0,00';
    }
};

// Importar configuración centralizada
import { firebaseConfig } from './firebase-config.js';

const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nebula-demo-app';

// Modo invitado con localStorage (cuando no hay configuración de Firebase válida)
const useLocalStorage = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'demo-api-key' || Object.values(firebaseConfig).every(val => !val || val.includes('demo'));

// --- CONTEXTO GLOBAL ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('dashboard');
    const [theme, setTheme] = useState('dark');
    const [currency, setCurrency] = useState('ARS');
    const [dolarMep, setDolarMep] = useState(1000);
    const [selectedDate, setSelectedDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [dashboardLayout, setDashboardLayout] = useState(['netoTotal', 'flujoMensual', 'gastosMes', 'metas']);
    const [isGuestMode, setIsGuestMode] = useState(false);
    
    // Sistema de notificaciones
    const [notification, setNotification] = useState(null);
    
    // Sistema de confirmación
    const [confirmModal, setConfirmModal] = useState(null);
    
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    const [ingresos, setIngresos] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [deudas, setDeudas] = useState([]);
    const [inversiones, setInversiones] = useState([]);
    const [metas, setMetas] = useState([]);
    const [presupuestos, setPresupuestos] = useState({});
    const [habilidades, setHabilidades] = useState({});

    // Efecto inicial para detectar el modo de funcionamiento
    useEffect(() => {
        if (useLocalStorage) {
            console.log('Usando modo invitado (sin Firebase)');
            setIsGuestMode(true);
        }
    }, []);

    useEffect(() => {
        if (isGuestMode && useLocalStorage) {
            // Modo invitado: usar localStorage
            setUserId('guest-user');
            // Cargar configuración desde localStorage
            const savedSettings = localStorage.getItem('nebula-settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                setTheme(settings.theme || 'dark');
                setCurrency(settings.currency || 'ARS');
                setDolarMep(settings.dolarMep || 1000);
                setDashboardLayout(settings.dashboardLayout || ['netoTotal', 'flujoMensual', 'gastosMes', 'metas']);
                setPresupuestos(settings.presupuestos || {});
                setHabilidades(settings.habilidades || {});
            }
        } else if (!useLocalStorage && Object.keys(firebaseConfig).length > 0) {
            try {
                console.log('Iniciando Firebase con configuración:', firebaseConfig);
                const app = initializeApp(firebaseConfig);
                setDb(getFirestore(app));
                setAuth(getAuth(app));
            } catch (error) {
                console.error('Error al inicializar Firebase, usando modo invitado:', error);
                // Si falla Firebase, usar modo invitado automáticamente
                setIsGuestMode(true);
                setUserId('guest-user');
            }
        } else {
            // Fallback al modo invitado si no hay configuración válida
            console.log('No hay configuración de Firebase válida, usando modo invitado');
            setIsGuestMode(true);
            setUserId('guest-user');
        }
    }, [isGuestMode]);

    useEffect(() => {
        if (isGuestMode && useLocalStorage) {
            // En modo invitado, ya se configuró el userId como 'guest-user'
            return;
        }
        
        if (!auth) return;
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                const settingsRef = doc(db, `artifacts/${appId}/users/${user.uid}/settings`, 'main');
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    setTheme(settings.theme || 'dark');
                    setCurrency(settings.currency || 'ARS');
                    setDolarMep(settings.dolarMep || 1000);
                    setDashboardLayout(settings.dashboardLayout || ['netoTotal', 'flujoMensual', 'gastosMes', 'metas']);
                    setPresupuestos(settings.presupuestos || {});
                    setHabilidades(settings.habilidades || {});
                }
            } else {
                setUserId(null);
            }
        });
        return () => unsubAuth();
    }, [auth, db]);

    // Agregar registro de depuración en dataListener
    const dataListener = (collectionName, setData, filterByDate = false) => {
        if (isGuestMode && useLocalStorage) {
            // Modo invitado: usar localStorage
            const storageKey = `nebula-${collectionName}`;
            const storedData = localStorage.getItem(storageKey);
            let data = storedData ? JSON.parse(storedData) : [];

            if (filterByDate) {
                const startOfMonth = new Date(selectedDate.year, selectedDate.month, 1);
                const endOfMonth = new Date(selectedDate.year, selectedDate.month + 1, 0, 23, 59, 59);
                data = data.filter(item => {
                    if (!item.date) return false;
                    const itemDate = new Date(item.date);
                    return itemDate >= startOfMonth && itemDate <= endOfMonth;
                });
            }

            data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            setData(data);
            return () => {};
        }

        if (!db || !userId) {

            setData([]);
            return () => {};
        }
        
        let q;
        if (filterByDate) {
             const startOfMonth = new Date(selectedDate.year, selectedDate.month, 1);
             const endOfMonth = new Date(selectedDate.year, selectedDate.month + 1, 0, 23, 59, 59);
             q = query(
                collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`),
                where("date", ">=", startOfMonth),
                where("date", "<=", endOfMonth)
            );
        } else {
             q = query(collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`));
        }

        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            setData(data);
        }, (error) => console.error(`Error en ${collectionName}:`, error));
    };
    
    useEffect(() => dataListener('ingresos', setIngresos, true), [db, userId, selectedDate, useLocalStorage, isGuestMode]);
    useEffect(() => dataListener('gastos', setGastos, true), [db, userId, selectedDate, useLocalStorage, isGuestMode]);
    useEffect(() => dataListener('deudas', setDeudas, false), [db, userId, useLocalStorage, isGuestMode]);
    useEffect(() => dataListener('inversiones', setInversiones, false), [db, userId, useLocalStorage, isGuestMode]);
    useEffect(() => dataListener('metas', setMetas, false), [db, userId, useLocalStorage, isGuestMode]);

    // Agregar registro de depuración para verificar los datos de metas
    useEffect(() => {

    }, [metas]);

    useEffect(() => {
        document.documentElement.className = theme;
    }, [theme]);

    const saveSettings = async (newSettings) => {
        if (isGuestMode && useLocalStorage) {
            // Modo invitado: guardar en localStorage
            const currentSettings = JSON.parse(localStorage.getItem('nebula-settings') || '{}');
            const updatedSettings = { ...currentSettings, ...newSettings };
            localStorage.setItem('nebula-settings', JSON.stringify(updatedSettings));
            return;
        }
        
        if (!db || !userId) return;
        const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/settings`, 'main');
        await setDoc(settingsRef, newSettings, { merge: true });
    };

    // Funciones para el sistema de notificaciones
    const showNotification = (message, type = 'info', duration = 5000) => {
        setNotification({ message, type, id: Date.now() });
        if (duration > 0) {
            setTimeout(() => setNotification(null), duration);
        }
    };

    const hideNotification = () => {
        setNotification(null);
    };

    // Funciones para el sistema de confirmación
    const showConfirm = (message, title = "Confirmar acción") => {
        return new Promise((resolve) => {
            setConfirmModal({
                title,
                message,
                onConfirm: () => {
                    setConfirmModal(null);
                    resolve(true);
                },
                onClose: () => {
                    setConfirmModal(null);
                    resolve(false);
                }
            });
        });
    };

    const value = {
        page, setPage, theme, setTheme, currency, setCurrency, dolarMep, setDolarMep,
        selectedDate, setSelectedDate, db, auth, userId, appId, useLocalStorage,
        ingresos, gastos, deudas, inversiones, metas, saveSettings,
        setIngresos, setGastos, setDeudas, setInversiones, setMetas,
        isPrivacyMode, setIsPrivacyMode, dashboardLayout, setDashboardLayout,
        presupuestos, setPresupuestos, habilidades, setHabilidades,
        isGuestMode, setIsGuestMode,
        // Sistema de notificaciones
        showNotification, hideNotification, notification,
        // Sistema de confirmación
        showConfirm, confirmModal
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- COMPONENTES ---

// Componente de Notificación Personalizada
const NotificationModal = () => {
    const { notification, hideNotification } = useContext(AppContext);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [notification]);

    if (!notification) return null;

    const getIcon = () => {
        switch (notification.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getColorClasses = () => {
        switch (notification.type) {
            case 'success': return 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
            case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
            case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
            default: return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
            <div className={`
                max-w-md p-4 rounded-lg border-2 shadow-lg backdrop-blur-sm
                ${getColorClasses()}
                animate-slide-in-right
            `}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{getIcon()}</span>
                    <div className="flex-1">
                        <p className="font-medium text-sm leading-relaxed">{notification.message}</p>
                    </div>
                    <button 
                        onClick={hideNotification}
                        className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente de Confirmación Personalizada
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-background-secondary rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-primary/50">
                <div className="text-center">
                    <div className="mb-4">
                        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <icons.warning className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
                        <p className="text-text-secondary">{message}</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-background-terciary text-text-secondary rounded-lg hover:bg-background-primary transition-colors border border-border-color"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const WelcomeScreen = () => {
    const { auth, setIsGuestMode, showNotification } = useContext(AppContext);
    const [typedTitle, setTypedTitle] = useState('');
    const [typedSlogan, setTypedSlogan] = useState('');
    const slogans = [
        "Planifica. Ejecuta. Prospera.",
        "Tu camino claro hacia la abundancia.",
        "Administra hoy tu futuro financiero.",
        "Objetivos definidos. Resultados reales.",
        "Tu universo financiero, en orden."
    ];
    const fullTitle = "Nebula";

    const handleGoogleSignIn = async () => {
        if (useLocalStorage || !auth) {
            showNotification("Firebase no está configurado. Usa el modo invitado para probar la aplicación.", "warning");
            return;
        }
        
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            console.log("Autenticación con Google exitosa.");
        } catch (error) {
            console.error("Error al iniciar sesión con Google:", error);
            showNotification("No se pudo iniciar sesión con Google. Por favor, verifica tu conexión y configuración.", "error");
        }
    };

    const handleGuestSignIn = async () => {
        if (useLocalStorage) {
            // Modo invitado sin Firebase
            setIsGuestMode(true);
            
            // Crear datos de ejemplo para el modo invitado si no existen
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            
            const sampleData = {
                'nebula-ingresos': [
                    {
                        id: 'sample-ingreso-1',
                        description: 'Salario',
                        amount: 500000,
                        category: 'Trabajo',
                        date: new Date(currentYear, currentMonth, 1).toISOString(),
                        order: 0
                    },
                    {
                        id: 'sample-ingreso-2',
                        description: 'Freelance',
                        amount: 150000,
                        category: 'Trabajo Extra',
                        date: new Date(currentYear, currentMonth, 15).toISOString(),
                        order: 1
                    }
                ],
                'nebula-gastos': [
                    {
                        id: 'sample-gasto-1',
                        description: 'Supermercado',
                        amount: 80000,
                        category: 'Alimentación',
                        date: new Date(currentYear, currentMonth, 5).toISOString(),
                        order: 0
                    },
                    {
                        id: 'sample-gasto-2',
                        description: 'Transporte',
                        amount: 35000,
                        category: 'Movilidad',
                        date: new Date(currentYear, currentMonth, 10).toISOString(),
                        order: 1
                    },
                    {
                        id: 'sample-gasto-3',
                        description: 'Servicios',
                        amount: 120000,
                        category: 'Hogar',
                        date: new Date(currentYear, currentMonth, 20).toISOString(),
                        order: 2
                    }
                ],
                'nebula-metas': [
                    {
                        id: 'sample-meta-1',
                        description: 'Vacaciones',
                        targetAmount: 1000000,
                        currentAmount: 350000,
                        date: new Date().toISOString(),
                        order: 0
                    },
                    {
                        id: 'sample-meta-2',
                        description: 'Fondo de Emergencia',
                        targetAmount: 2000000,
                        currentAmount: 800000,
                        date: new Date().toISOString(),
                        order: 1
                    }
                ],
                'nebula-deudas': [
                    {
                        id: 'sample-deuda-1',
                        description: 'Tarjeta de Crédito',
                        amount: 300000,
                        monthlyPayment: 50000,
                        paidAmount: 150000,
                        date: new Date().toISOString(),
                        order: 0
                    }
                ],
                'nebula-inversiones': [
                    {
                        id: 'sample-inversion-1',
                        description: 'Plazo Fijo',
                        type: 'Renta Fija',
                        amount: 500000,
                        date: new Date().toISOString(),
                        order: 0
                    },
                    {
                        id: 'sample-inversion-2',
                        description: 'FCI Renta Variable',
                        type: 'Renta Variable',
                        amount: 300000,
                        date: new Date().toISOString(),
                        order: 1
                    }
                ]
            };

            // Solo agregar datos de ejemplo si no existen datos previos
            Object.keys(sampleData).forEach(key => {
                if (!localStorage.getItem(key)) {
                    localStorage.setItem(key, JSON.stringify(sampleData[key]));
                    // Datos de ejemplo creados
                    // Datos de ejemplo creados para ${key}
                }
            });


            return;
        }

        if (!auth) {
            console.error("Firebase no está inicializado para el modo invitado.");
            showNotification("No se pudo activar el modo invitado. Verifica la configuración de Firebase.", "error");
            return;
        }

        try {
            await signInAnonymously(auth);

        } catch (error) {
            console.error("Error al iniciar sesión como invitado:", error);
            showNotification("No se pudo activar el modo invitado. Por favor, verifica tu conexión y configuración.", "error");
        }
    };

    useEffect(() => {
        if (typedTitle.length < fullTitle.length) {
            const timeout = setTimeout(() => {
                setTypedTitle(fullTitle.slice(0, typedTitle.length + 1));
            }, 150);
            return () => clearTimeout(timeout);
        }
    }, [typedTitle]);

    useEffect(() => {
        let timeoutId;
        const type = () => {
            let sloganIndex = 0;
            let charIndex = 0;
            let isDeleting = false;

            const typeWriter = () => {
                const currentSlogan = slogans[sloganIndex];
                if (isDeleting) {
                    setTypedSlogan(currentSlogan.substring(0, charIndex - 1));
                    charIndex--;
                } else {
                    setTypedSlogan(currentSlogan.substring(0, charIndex + 1));
                    charIndex++;
                }

                let delay = isDeleting ? 50 : 100;

                if (!isDeleting && charIndex === currentSlogan.length) {
                    delay = 2000;
                    isDeleting = true;
                } else if (isDeleting && charIndex === 0) {
                    delay = 500;
                    isDeleting = false;
                    sloganIndex = (sloganIndex + 1) % slogans.length;
                }
                
                timeoutId = setTimeout(typeWriter, delay);
            };
            typeWriter();
        }
        
        const initialTimeout = setTimeout(type, 2000);

        return () => {
            clearTimeout(initialTimeout);
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="parallax">
                <div className="stars layer1"></div>
                <div className="stars layer2"></div>
            </div>
            <div className="relative min-h-screen flex flex-col justify-center items-center text-center p-4 transition-opacity duration-1000">
                <h1 id="nebula-title" className="text-7xl md:text-9xl font-serif text-amber-400 mb-4" style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 15px rgba(250, 190, 88, 0.5)' }}>{typedTitle}</h1>
                <p className="text-gray-300 text-lg md:text-2xl h-8 mb-8">{typedSlogan}<span className="animate-ping">|</span></p>
                <div className="bg-background-secondary/20 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/20 animate-fade-in">
                    <div className="flex flex-col gap-4">
                         <button onClick={handleGoogleSignIn} className="bg-white text-gray-800 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-200 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-3">
                            <icons.google className="w-6 h-6"/>
                            Ingresar con Google
                        </button>
                         <button onClick={handleGuestSignIn} className="bg-white/10 border border-white/20 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-white/20 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105">
                            Ingresar como Invitado
                        </button>
                    </div>
                     <p className="text-xs text-white/50 mt-4 max-w-xs mx-auto">Al ingresar como invitado, tus datos se guardarán solo en este dispositivo y no estarán disponibles en la nube.</p>
                </div>
            </div>
        </div>
    );
};

const PrivacyNumber = ({ value }) => {
    const { isPrivacyMode } = useContext(AppContext);
    if (isPrivacyMode) {
        return <span className="font-mono tracking-widest">********</span>;
    }
    return <>{value}</>;
};

const Dashboard = () => {
    const { isPrivacyMode, setIsPrivacyMode, theme, setTheme, dashboardLayout, setDashboardLayout, saveSettings, selectedDate, showNotification, showConfirm } = useContext(AppContext);
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleDragStart = (e, position) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;

        const newLayout = [...dashboardLayout];
        const dragItemContent = newLayout[dragItem.current];
        newLayout.splice(dragItem.current, 1);
        newLayout.splice(dragOverItem.current, 0, dragItemContent);

        dragItem.current = null;
        dragOverItem.current = null;

        setDashboardLayout(newLayout);
        saveSettings({ dashboardLayout: newLayout });
    };

    const renderWidget = (widgetId) => {
        switch (widgetId) {
            case 'netoTotal': return <NetoTotalWidget />;
            case 'flujoMensual': return <FlujoMensualWidget />;
            case 'gastosMes': return <GastosMesWidget />;
            case 'metas': return <MetasWidget />;
            case 'inversiones': return <InversionesWidget />;
            case 'graficoGastos': return <GraficoGastosWidget />;
            case 'deudas': return <DeudasWidget />;
            default: return null;
        }
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary mb-4">Dashboard</h1>
                <button onClick={() => setIsCalendarOpen(true)} className="flex items-center gap-2 text-text-secondary bg-background-secondary border border-border-color rounded-lg px-3 py-1 shadow-sm hover:shadow-md hover:text-primary transform hover:-translate-y-0.5 transition-all duration-200 mx-auto mb-4">
                    <icons.calendar className="w-5 h-5"/>
                    <span>{new Date(selectedDate.year, selectedDate.month).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</span>
                </button>
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-text-secondary hover:text-primary transition-colors p-2" title="Cambiar Tema">
                        {theme === 'dark' ? <icons.sun className="w-6 h-6 text-yellow-500" /> : <icons.moon className="w-6 h-6 text-blue-500" />}
                    </button>
                    <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="text-text-secondary hover:text-primary transition-colors p-2" title="Modo Privacidad">
                        {isPrivacyMode ? <icons.eyeOff className="w-6 h-6"/> : <icons.eye className="w-6 h-6"/>}
                    </button>
                    <button onClick={() => setIsCustomizeModalOpen(true)} className="text-text-secondary hover:text-primary transition-colors p-2" title="Personalizar Dashboard">
                        <icons.filter className="w-6 h-6"/>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {dashboardLayout.map((widgetId, index) => (
                    <div key={widgetId}
                         draggable
                         onDragStart={(e) => handleDragStart(e, index)}
                         onDragEnter={(e) => handleDragEnter(e, index)}
                         onDragEnd={handleDragEnd}
                         onDragOver={(e) => e.preventDefault()}
                         className="animate-fade-in cursor-grab"
                    >
                        {renderWidget(widgetId)}
                    </div>
                ))}
            </div>
            {isCustomizeModalOpen && <CustomizeDashboardModal onClose={() => setIsCustomizeModalOpen(false)} />}
            {isCalendarOpen && <CalendarModal onClose={() => setIsCalendarOpen(false)} />}
        </div>
    );
};

// --- WIDGETS DEL DASHBOARD ---
const NetoTotalWidget = () => {
    const { ingresos, gastos, deudas, inversiones, currency, dolarMep } = useContext(AppContext);
    const netoTotal = useMemo(() => 
        (ingresos.reduce((s,i)=>s+i.amount,0) + inversiones.reduce((s,i)=>s+i.amount,0)) - 
        (gastos.reduce((s,g)=>s+g.amount,0) + deudas.reduce((s,d)=>s+d.amount,0)), 
    [ingresos, gastos, deudas, inversiones]);
    return <Card title="Neto Total" value={<PrivacyNumber value={formatCurrency(netoTotal, currency, dolarMep)} />} detail="Ingresos + Inversiones - Gastos - Deudas" color="text-accent-green" />;
};
const FlujoMensualWidget = () => {
    const { ingresos, gastos, currency, dolarMep } = useContext(AppContext);
    const flujoMensual = useMemo(() => ingresos.reduce((s, i) => s + i.amount, 0) - gastos.reduce((s, g) => s + g.amount, 0), [ingresos, gastos]);
    return <Card title="Neto Mensual" value={<PrivacyNumber value={formatCurrency(flujoMensual, currency, dolarMep)} />} detail="Ingresos - Gastos (del mes)" color={flujoMensual >= 0 ? "text-accent-cyan" : "text-accent-magenta"} />;
};
const GastosMesWidget = () => {
    const { gastos, currency, dolarMep } = useContext(AppContext);
    const totalGastos = useMemo(() => gastos.reduce((sum, g) => sum + g.amount, 0), [gastos]);
    const topGastos = useMemo(() => 
        gastos
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3), 
        [gastos]
    );

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color h-full">
            <h2 className="text-lg font-semibold text-text-secondary mb-2">Gastos del Mes</h2>
            <div className="text-3xl font-bold text-accent-magenta mb-2">
                <PrivacyNumber value={formatCurrency(totalGastos, currency, dolarMep)} />
            </div>
            <span className="text-sm text-text-secondary mb-4 block">En {gastos.length} transacciones</span>
            
            {topGastos.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-text-secondary mb-2">Gastos más grandes:</p>
                    {topGastos.map((gasto, index) => (
                        <div key={gasto.id} className="flex justify-between items-center text-xs">
                            <span className="text-text-secondary truncate flex-1 mr-2">
                                {index + 1}. {gasto.description}
                            </span>
                            <span className="text-accent-magenta font-semibold">
                                <PrivacyNumber value={formatCurrency(gasto.amount, currency, dolarMep)} />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const InversionesWidget = () => {
    const { inversiones, currency, dolarMep } = useContext(AppContext);
    const totalInversiones = useMemo(() => inversiones.reduce((sum, i) => sum + i.amount, 0), [inversiones]);
    return <Card title="Inversiones" value={<PrivacyNumber value={formatCurrency(totalInversiones, currency, dolarMep)} />} detail="Valor total de tus inversiones" color="text-accent-gold" />;
};
const MetasWidget = () => {
    const { metas, currency, dolarMep } = useContext(AppContext);

    // Filtrar metas con valores válidos
    const validMetas = metas.filter(meta => meta.currentAmount >= 0 && meta.targetAmount > 0);

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color h-full">
            <h2 className="text-lg font-semibold text-text-secondary mb-4">Metas Financieras</h2>
            <div className="space-y-4">
                {validMetas.length > 0 ? validMetas.slice(0, 2).map(meta => (
                    <GoalProgress key={meta.id} meta={meta} currency={currency} dolarMep={dolarMep} />
                )) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <icons.metas className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-text-secondary text-sm mb-2">No hay metas cargadas aún</p>
                        <p className="text-text-secondary text-xs opacity-75">Ve a la sección Metas para agregar tus objetivos financieros</p>
                    </div>
                )}
            </div>
        </div>
    );
};
const GraficoGastosWidget = () => {
    const { gastos } = useContext(AppContext);
    const data = useMemo(() => {
        const categoryTotals = gastos.reduce((acc, gasto) => {
            const category = gasto.category || 'Varios';
            acc[category] = (acc[category] || 0) + gasto.amount;
            return acc;
        }, {});
        return Object.entries(categoryTotals).map(([name, amount]) => ({ name, Gastos: amount }));
    }, [gastos]);

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color h-full md:col-span-2 lg:col-span-1">
            <h2 className="text-lg font-semibold text-text-secondary mb-4">Gastos por Categoría</h2>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickFormatter={(value) => `$${value/1000}k`}/>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-terciary)', border: '1px solid var(--color-border)' }}/>
                    <Legend wrapperStyle={{ fontSize: '14px' }}/>
                    <Bar dataKey="Gastos" fill="var(--color-primary)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
const DeudasWidget = () => {
    const { deudas, currency, dolarMep } = useContext(AppContext);
    const totalDeudas = useMemo(() => deudas.reduce((sum, d) => sum + d.amount, 0), [deudas]);
    const totalPagado = useMemo(() => deudas.reduce((sum, d) => sum + d.paidAmount, 0), [deudas]);
    const progreso = useMemo(() => (totalDeudas > 0 ? (totalPagado / totalDeudas) * 100 : 0), [totalDeudas, totalPagado]);

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color h-full">
            <h2 className="text-lg font-semibold text-text-secondary mb-4">Deudas</h2>
            <div className="space-y-4">
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-primary">Progreso</span>
                    <span className="text-sm font-medium text-primary">{Math.round(progreso)}%</span>
                </div>
                <div className="w-full bg-background-tertiary rounded-full h-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-accent-cyan to-primary h-4 rounded-full transition-width duration-500" style={{ width: `${progreso}%` }}></div>
                </div>
                <div className="text-right text-sm text-text-secondary mt-1">
                    <PrivacyNumber value={`${formatCurrency(totalPagado, currency, dolarMep)} / ${formatCurrency(totalDeudas, currency, dolarMep)}`} />
                </div>
            </div>
        </div>
    );
};

const CustomizeDashboardModal = ({ onClose }) => {
    const { dashboardLayout, setDashboardLayout, saveSettings } = useContext(AppContext);
    const [localLayout, setLocalLayout] = useState(dashboardLayout);

    const allWidgets = {
        netoTotal: "Neto Total",
        flujoMensual: "Neto Mensual",
        gastosMes: "Gastos del Mes",
        inversiones: "Inversiones",
        metas: "Metas",
        graficoGastos: "Gráfico de Gastos",
        deudas: "Visualizar Deudas",
    };

    const handleToggle = (widgetId) => {
        setLocalLayout(prev => 
            prev.includes(widgetId) 
                ? prev.filter(id => id !== widgetId)
                : [...prev, widgetId]
        );
    };

    const handleSave = () => {
        setDashboardLayout(localLayout);
        saveSettings({ dashboardLayout: localLayout });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-background-secondary rounded-xl shadow-2xl p-6 w-full max-w-md border border-border-color">
                <h2 className="text-2xl font-bold mb-4 text-text-primary">Personalizar Dashboard</h2>
                <div className="space-y-2">
                    {Object.entries(allWidgets).map(([id, name]) => (
                        <label key={id} className="flex items-center gap-3 p-2 rounded-md hover:bg-background-terciary cursor-pointer">
                            <input type="checkbox" checked={localLayout.includes(id)} onChange={() => handleToggle(id)} className="h-5 w-5 rounded-md text-primary bg-background-terciary border-border-color focus:ring-primary"/>
                            <span className="text-text-primary">{name}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-border-color">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-background-terciary text-text-primary rounded-md hover:bg-background-terciary/50">Cancelar</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80">Guardar</button>
                </div>
            </div>
        </div>
    );
};


const Card = ({ title, value, detail, color }) => (
    <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color h-full">
        <h2 className="text-lg font-semibold text-text-secondary">{title}</h2>
        <div className={`text-3xl font-bold ${color} mt-2`}>{value}</div>
        <span className="text-sm text-text-secondary">{detail}</span>
    </div>
);

const GoalProgress = ({ meta, currency, dolarMep }) => {
    const progress = meta.targetAmount > 0 ? (meta.currentAmount / meta.targetAmount) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-primary">{meta.description}</span>
                <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-background-terciary rounded-full h-4 overflow-hidden">
                <div className="bg-gradient-to-r from-accent-cyan to-primary h-4 rounded-full transition-width duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="text-right text-sm text-text-secondary mt-1">
                <PrivacyNumber value={`${formatCurrency(meta.currentAmount, currency, dolarMep)} / ${formatCurrency(meta.targetAmount, currency, dolarMep)}`} />
            </div>
        </div>
    );
};

const FormattedCurrencyInput = ({ value, onChange }) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        const numberValue = Number(value) || 0;
        setDisplayValue(new Intl.NumberFormat('es-AR').format(numberValue));
    }, [value]);

    const handleChange = (e) => {
        const rawValue = e.target.value.replace(/\./g, '');
        if (/^\d*$/.test(rawValue)) {
            const num = Number(rawValue);
            setDisplayValue(new Intl.NumberFormat('es-AR').format(num));
            onChange(num);
        }
    };

    return <input type="text" value={displayValue} onChange={handleChange} className="w-full px-3 py-2 border border-border-color rounded-md bg-background-terciary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />;
};

const CrudModal = ({ item, onClose, onSave, title, fieldsConfig, loading }) => {
    const initialFormState = fieldsConfig.reduce((acc, field) => {
        acc[field.name] = item?.[field.name] || field.defaultValue || '';
        return acc;
    }, {});
    const [formData, setFormData] = useState(initialFormState);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-background-secondary rounded-xl shadow-2xl p-6 w-full max-w-md border border-border-color relative">
                {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-10">
                        <div className="loader" />
                    </div>
                )}
                <h2 className="text-2xl font-bold mb-4 text-text-primary">{item ? 'Editar' : 'Agregar'} {title.slice(0, -1)}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {fieldsConfig.map(field => (
                        <div key={field.name}>
                            <label htmlFor={field.name} className="block text-sm font-medium text-text-secondary mb-1">{field.label}</label>
                            {field.type === 'currency' ? (
                                <FormattedCurrencyInput value={formData[field.name]} onChange={(val) => handleChange(field.name, val)} />
                            ) : (
                                <input type={field.type || 'text'} name={field.name} id={field.name} value={formData[field.name]}
                                    onChange={(e) => handleChange(field.name, e.target.value)} required
                                    className="w-full px-3 py-2 border border-border-color rounded-md bg-background-terciary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                            )}
                        </div>
                    ))}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-background-terciary text-text-primary rounded-md hover:bg-background-terciary/50">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Settings = () => {
    const { auth, ingresos, gastos, deudas, inversiones, metas, showNotification } = useContext(AppContext);

    const handleLogout = async () => {
        if (auth) {
            try {
                await auth.signOut();
                showNotification("Sesión cerrada exitosamente.", "success");
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                showNotification("No se pudo cerrar la sesión. Por favor, intenta nuevamente.", "error");
            }
        }
    };

    const handleDownloadXLS = () => {
        const workbook = XLSX.utils.book_new();

        const createSheet = (data, sheetName) => {
            const formattedData = data.map(item => ({
                Descripción: item.description || '',
                Monto: item.amount || '',
                Fecha: item.date ? new Date(item.date).toLocaleDateString() : '',
                Categoría: item.category || '',
                "Cuota Mensual": item.monthlyPayment || '',
                "Monto Pagado": item.paidAmount || '',
            }));
            const worksheet = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        };

        createSheet(ingresos, 'Ingresos');
        createSheet(gastos, 'Gastos');
        createSheet(deudas, 'Deudas');
        createSheet(inversiones, 'Inversiones');
        createSheet(metas, 'Metas');

        XLSX.writeFile(workbook, 'Nebula_Datos.xlsx');
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Configuración</h1>
            </div>
            <div className="space-y-8 max-w-2xl">
                <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Cerrar Sesión</h2>
                    <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-all">Cerrar Sesión</button>
                </div>
                <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color">
                    <h2 className="text-xl font-semibold mb-4 text-text-primary">Descargar Datos</h2>
                    <button onClick={handleDownloadXLS} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all">Descargar XLS</button>
                </div>
            </div>
        </div>
    );
};

const Dock = () => {
    const { page, setPage } = useContext(AppContext);
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard }, 
        { id: 'ingresos', label: 'Ingresos', icon: icons.ingresos },
        { id: 'gastos', label: 'Gastos', icon: icons.gastos }, 
        { id: 'deudas', label: 'Deudas', icon: icons.deudas },
        { id: 'inversiones', label: 'Inversiones', icon: icons.inversiones }, 
        { id: 'metas', label: 'Metas', icon: icons.metas },
        { id: 'settings', label: 'Settings', icon: icons.settings },
    ];

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <div className="flex items-end justify-center h-20 space-x-2 bg-background-secondary/70 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-border-color">
                {navItems.map(item => {
                    const isActive = page === item.id;
                    return (
                        <button key={item.id} onClick={() => setPage(item.id)}
                            className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-300 ease-in-out group ${isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-primary/20'}`}>
                            <item.icon className={`w-7 h-7 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="absolute -top-8 text-xs font-bold px-2 py-1 bg-gray-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPONENTE TOOLTIP ---
const CustomTooltip = ({ children, text, position = "top" }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
        <div className="relative inline-block"
             onMouseEnter={() => setIsVisible(true)}
             onMouseLeave={() => setIsVisible(false)}>
            {children}
            {isVisible && (
                <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded-md whitespace-nowrap 
                    ${position === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' : ''}
                    ${position === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' : ''}
                    ${position === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' : ''}
                    ${position === 'right' ? 'left-full ml-2 top-1/2 transform -translate-y-1/2' : ''}
                    animate-fade-in`}>
                    {text}
                    <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45
                        ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
                        ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
                        ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
                        ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}`}>
                    </div>
                </div>
            )}
        </div>
    );
};

const CrudPage = ({ title, data, setData, collectionName, fieldsConfig }) => {
    const { db, userId, appId, selectedDate, currency, dolarMep, useLocalStorage, isGuestMode, showNotification, showConfirm } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [loading, setLoading] = useState(false);
    // Definir la variable dragging como un estado local para evitar errores de referencia
    const [dragging, setDragging] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' o 'compact'
    
    // Referencias para el drag and drop
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleAdd = () => { setCurrentItem(null); setIsModalOpen(true); };
    const handleEdit = (item) => { setCurrentItem(item); setIsModalOpen(true); };
    const handleDelete = async (id) => {

        
        try {
            const confirmed = await showConfirm('¿Estás seguro de que quieres eliminar este elemento?', 'Confirmar eliminación');
            
            if (confirmed) {
                setLoading(true);
                setIsModalOpen(false);

                if (isGuestMode && useLocalStorage) {
                    const storageKey = `nebula-${collectionName}`;
                    const storedData = localStorage.getItem(storageKey);
                    let allData = storedData ? JSON.parse(storedData) : [];

                    allData = allData.filter(item => item.id !== id);
                    localStorage.setItem(storageKey, JSON.stringify(allData));

                    setData(allData);
                    showNotification('Elemento eliminado correctamente', 'success');
                } else {
                    if (!db || !userId) {
                        console.error('❌ No se puede eliminar: db o userId no están definidos.');
                        showNotification('Error: No se pudo conectar a la base de datos', 'error');
                        setLoading(false);
                        return;
                    }
                    try {
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, id);
                        await deleteDoc(docRef);

                        const updatedData = data.filter(item => item.id !== id);
                        setData(updatedData);
                        showNotification('Elemento eliminado correctamente', 'success');
                    } catch (error) {
                        console.error('❌ Error al eliminar el elemento:', error);
                        showNotification('Error al eliminar el elemento', 'error');
                    }
                }
                setLoading(false);
            }
        } catch (error) {
            console.error('❌ Error en handleDelete:', error);
            showNotification('Error inesperado al eliminar', 'error');
            setLoading(false);
        }
    };
    
    const handleSave = async (itemData) => {
        let dataToSave = { ...itemData };
        const isTimeScoped = collectionName === 'ingresos' || collectionName === 'gastos';
        
        if (isTimeScoped) {
           dataToSave.date = new Date(selectedDate.year, selectedDate.month, new Date().getDate());
        } else {
           dataToSave.date = new Date();
        }

        if (isGuestMode && useLocalStorage) {
            // Modo invitado: usar localStorage
            const storageKey = `nebula-${collectionName}`;
            const storedData = localStorage.getItem(storageKey);
            let allData = storedData ? JSON.parse(storedData) : [];
            
            if (currentItem) {
                // Editar elemento existente
                const index = allData.findIndex(item => item.id === currentItem.id);
                if (index !== -1) {
                    allData[index] = { ...allData[index], ...dataToSave };
                }
            } else {
                // Agregar nuevo elemento
                const maxOrder = allData.reduce((max, item) => ((item.order ?? 0) > max ? item.order : max), -1);
                dataToSave.order = maxOrder + 1;
                dataToSave.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                allData.push(dataToSave);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(allData));
            
            // Actualizar el estado local

            refreshLocalStorageData(collectionName, setData, selectedDate, collectionName === 'ingresos' || collectionName === 'gastos');
        } else {
            if (!db || !userId) return;
            if (currentItem) {
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, currentItem.id), dataToSave);
            } else {
                const maxOrder = data.reduce((max, item) => ((item.order ?? 0) > max ? item.order : max), -1);
                dataToSave.order = maxOrder + 1;
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`), dataToSave);
            }
        }
        
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    // Validación y sanitización de datos de entrada
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 1000); // Limitar longitud
};

const validateAmount = (amount) => {
    const num = Number(amount);
    return !isNaN(num) && isFinite(num) && num >= 0 && num <= 999999999999; // Límite razonable
};

const validateFormData = (data, fieldsConfig) => {
    const validatedData = {};
    
    fieldsConfig.forEach(field => {
        const value = data[field.name];
        
        if (field.type === 'currency') {
            if (!validateAmount(value)) {
                throw new Error(`Monto inválido para ${field.label}`);
            }
            validatedData[field.name] = Number(value);
        } else {
            const sanitized = sanitizeInput(value);
            if (!sanitized && field.required !== false) {
                throw new Error(`${field.label} es requerido`);
            }
            validatedData[field.name] = sanitized;
        }
    });
    
    return validatedData;
};

    // Asegurar que los valores de currentAmount y paidAmount se actualicen correctamente
    const validateAndSave = (itemData, collectionName) => {
        if (collectionName === 'metas') {
            itemData.currentAmount = itemData.currentAmount || 0;
            itemData.targetAmount = itemData.targetAmount || 0;
        } else if (collectionName === 'deudas') {
            itemData.paidAmount = itemData.paidAmount || 0;
            itemData.amount = itemData.amount || 0;
        }
        handleSave(itemData);
    };

    const handleSaveWrapper = (itemData) => {
        validateAndSave(itemData, collectionName);
    };

    const handleDragStart = (e, position) => {
        dragItem.current = position;
        setDragging(true);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e, position) => {
        dragOverItem.current = position;
        e.preventDefault();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = () => {
        setDragging(false);
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

        const newData = [...data];
        const dragItemContent = newData[dragItem.current];
        newData.splice(dragItem.current, 1);
        newData.splice(dragOverItem.current, 0, dragItemContent);

        dragItem.current = null;
        dragOverItem.current = null;

        setData(newData);

        if (isGuestMode && useLocalStorage) {
            // Modo invitado: guardar en localStorage
            const storageKey = `nebula-${collectionName}`;
            const updatedData = newData.map((item, index) => ({
                ...item,
                order: index
            }));
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
        } else {
            const batch = writeBatch(db);
            newData.forEach((item, index) => {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, item.id);
                batch.update(docRef, { order: index });
            });
            batch.commit().catch(err => console.error("Error al reordenar:", err));
        }
        
        showNotification('Elementos reordenados correctamente', 'success');
    };
    
    const handleRepeatPreviousMonth = async () => {
        const confirmed = await showConfirm("¿Quieres copiar los datos del mes anterior? Los datos existentes no se borrarán.", "Repetir mes anterior");
        if (!confirmed) return;

        const prevMonthDate = new Date(selectedDate.year, selectedDate.month - 1, 15);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        
        let prevMonthData = [];
        
        if (isGuestMode && useLocalStorage) {
            // Modo invitado: buscar en localStorage
            const storageKey = `nebula-${collectionName}`;
            const storedData = localStorage.getItem(storageKey);
            let allData = storedData ? JSON.parse(storedData) : [];
            
            const startOfPrevMonth = new Date(prevYear, prevMonth, 1);
            const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);
            
            prevMonthData = allData.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate >= startOfPrevMonth && itemDate <= endOfPrevMonth;
            });
        } else {
                       if (!db || !userId) return;
            const startOfPrevMonth = new Date(prevYear, prevMonth, 1);
            const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);

            const q = query(
                collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`),
                where("date", ">=", startOfPrevMonth),
                where("date", "<=", endOfPrevMonth)
            );
            
            const querySnapshot = await getDocs(q);
            prevMonthData = querySnapshot.docs.map(d => d.data());
        }
        
        if (prevMonthData.length === 0) {
            showNotification("No se encontraron datos en el mes anterior.", "warning");
            return;
        }
        
        if (isGuestMode && useLocalStorage) {
            // Modo invitado: agregar a localStorage
            const storageKey = `nebula-${collectionName}`;
            const storedData = localStorage.getItem(storageKey);
            let allData = storedData ? JSON.parse(storedData) : [];
            let currentOrder = allData.length;
            
            prevMonthData.forEach(item => {
                const newItem = {
                    ...item,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    date: new Date(selectedDate.year, selectedDate.month, new Date(item.date).getDate()),
                    order: currentOrder++
                };
                allData.push(newItem);
            });
            
            localStorage.setItem(storageKey, JSON.stringify(allData));
            
            // Actualizar el estado local
            refreshLocalStorageData(collectionName, setData, selectedDate, collectionName === 'ingresos' || collectionName === 'gastos');
        } else {
            const batch = writeBatch(db);
            let currentOrder = data.length;
            
            prevMonthData.forEach(item => {
                const newDocRef = doc(collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`));
                const newItem = {
                    ...item,
                    date: new Date(selectedDate.year, selectedDate.month, new Date(item.date.seconds * 1000).getDate()),
                    order: currentOrder++
                };
                batch.set(newDocRef, newItem);
            });

            await batch.commit();
        }
        
        showNotification(`${prevMonthData.length} elementos copiados del mes anterior.`, "success");
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {title} ({data.length})
                    </h2>
                    {data.length > 1 && (
                        <div className="text-xs text-text-secondary bg-background-primary px-2 py-1 rounded-full border border-border-color">
                            Arrastra para reordenar
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {/* Selector de vista */}
                    <div className="flex bg-background-primary border border-border-color rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                                viewMode === 'list' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                            title="Vista de lista"
                        >
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                                viewMode === 'compact' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                            title="Vista compacta"
                        >
                            Compacta
                        </button>
                    </div>
                    
                    {(collectionName === 'ingresos' || collectionName === 'gastos') && (
                        <button onClick={handleRepeatPreviousMonth} className="bg-primary/80 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary/60 transition-colors flex items-center gap-2" title="Repetir Mes Anterior">
                            <icons.repeat className="w-5 h-5"/> <span className="hidden sm:inline">Repetir</span>
                        </button>
                    )}
                    <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary/80 transition-colors">
                        Agregar {title.slice(0, -1)}
                    </button>
                </div>
            </div>
            <div className={`bg-background-secondary rounded-xl shadow-lg border border-border-color overflow-hidden ${
                viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0' : ''
            }`}>
                {data && data.length > 0 ? data.map((item, index) => (
                    viewMode === 'list' ? (
                        // Vista de lista normal
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            className={`group relative p-4 flex justify-between items-center border-b border-border-color last:border-b-0 transition-all duration-200 ${
                                dragging && dragItem.current === index 
                                    ? 'scale-105 shadow-2xl bg-primary/10 border-primary/30 opacity-90 transform rotate-1' 
                                    : 'hover:bg-background-primary/50 cursor-grab active:cursor-grabbing'
                            } ${
                                dragging && dragOverItem.current === index && dragItem.current !== index
                                    ? 'border-t-2 border-t-primary bg-primary/5'
                                    : ''
                            }`}
                        >
                            {/* Indicador visual de drag */}
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity duration-200 text-text-secondary">
                                <CustomTooltip text="Arrastra para reordenar" position="right">
                                    <icons.gripVertical className="w-4 h-4" />
                                </CustomTooltip>
                            </div>
                            
                            <div className="flex-1 ml-6">
                                <p className="font-semibold text-text-primary group-hover:text-primary transition-colors duration-200">
                                    {item.description}
                                </p>
                                <p className="text-sm text-text-secondary">
                                    {item.category || (item.date && new Date(item.date.seconds * 1000).toLocaleDateString())}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className={`font-bold text-lg transition-colors duration-200 ${
                                    collectionName === 'ingresos' ? 'text-accent-green' : 'text-accent-magenta'
                                } ${dragging && dragItem.current === index ? 'text-primary' : ''}`}>
                                    {formatCurrency(item.amount, currency, dolarMep)}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button 
                                        onClick={() => handleEdit(item)} 
                                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                                        title="Editar"
                                    >
                                        <icons.edit className="w-4 h-4"/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)} 
                                        className="p-2 text-text-secondary hover:text-accent-magenta hover:bg-accent-magenta/10 rounded-lg transition-all duration-200"
                                        title="Eliminar"
                                    >
                                        <icons.trash className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Indicador de posición durante drag */}
                            {dragging && dragOverItem.current === index && dragItem.current !== index && (
                                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-pulse"></div>
                            )}
                        </div>
                    ) : (
                        // Vista compacta (tarjetas)
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            className={`group relative p-4 border border-border-color transition-all duration-200 ${
                                dragging && dragItem.current === index 
                                    ? 'scale-105 shadow-2xl bg-primary/10 border-primary z-10' 
                                    : 'hover:bg-background-primary/50 cursor-grab active:cursor-grabbing hover:shadow-md'
                            } ${
                                dragging && dragOverItem.current === index && dragItem.current !== index
                                    ? 'border-primary bg-primary/5'
                                    : ''
                            }`}
                        >
                            {/* Indicador de drag para vista compacta */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200 text-text-secondary">
                                <CustomTooltip text="Arrastra para reordenar" position="left">
                                    <icons.gripVertical className="w-4 h-4" />
                                </CustomTooltip>
                            </div>
                            
                            <div className="mb-3">
                                <p className="font-semibold text-text-primary group-hover:text-primary transition-colors duration-200 text-sm line-clamp-2">
                                    {item.description}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {item.category || (item.date && new Date(item.date.seconds * 1000).toLocaleDateString())}
                                </p>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className={`font-bold text-sm ${
                                    collectionName === 'ingresos' ? 'text-accent-green' : 'text-accent-magenta'
                                }`}>
                                    {formatCurrency(item.amount, currency, dolarMep)}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button 
                                        onClick={() => handleEdit(item)} 
                                        className="p-1 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-all duration-200"
                                        title="Editar"
                                    >
                                        <icons.edit className="w-3 h-3"/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item.id)} 
                                        className="p-1 text-text-secondary hover:text-accent-magenta hover:bg-accent-magenta/10 rounded transition-all duration-200"
                                        title="Eliminar"
                                    >
                                        <icons.trash className="w-3 h-3"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                )) : (
                    <div className="p-8 text-center text-text-secondary">
                        <div className="mb-4 opacity-50">
                            {icons[collectionName] && React.createElement(icons[collectionName], { className: "w-16 h-16 mx-auto" })}
                        </div>
                        <p className="text-lg font-medium mb-2">No hay {title.toLowerCase()} registrados</p>
                        <p className="text-sm">Comienza agregando tu primer {title.slice(0, -1).toLowerCase()}</p>
                    </div>
                )}
            </div>
            {isModalOpen && <CrudModal item={currentItem} onClose={() => setIsModalOpen(false)} onSave={handleSaveWrapper} title={title} fieldsConfig={fieldsConfig} loading={loading} />}
        </div>
    );
};

// --- COMPONENTES PRINCIPALES Y LAYOUT ---

const MetasPage = () => {
    const { metas, setMetas, currency, dolarMep, db, userId, appId, useLocalStorage, isGuestMode, showConfirm, showNotification } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [loading, setLoading] = useState(false);

    const fieldsConfig = [
        { name: 'description', label: 'Descripción de la Meta' }, 
        { name: 'targetAmount', label: 'Monto Objetivo', type: 'currency' }, 
        { name: 'currentAmount', label: 'Monto Actual', type: 'currency', defaultValue: 0 }
    ];

    const handleAdd = () => { setCurrentItem(null); setIsModalOpen(true); };
    const handleEdit = (item) => { setCurrentItem(item); setIsModalOpen(true); };
    
    const handleDelete = async (id) => {

        
        try {
            const confirmed = await showConfirm('¿Estás seguro de que quieres eliminar esta meta?', 'Confirmar eliminación de meta');
            
            if (confirmed) {
                setLoading(true);

                if (isGuestMode && useLocalStorage) {
                    const storageKey = 'nebula-metas';
                    const storedData = localStorage.getItem(storageKey);
                    let allData = storedData ? JSON.parse(storedData) : [];

                    allData = allData.filter(item => item.id !== id);
                    localStorage.setItem(storageKey, JSON.stringify(allData));

                    setMetas(allData);
                    showNotification('Meta eliminada correctamente', 'success');
                } else {
                    if (!db || !userId) {
                        console.error('❌ No se puede eliminar: db o userId no están definidos.');
                        showNotification('Error: No se pudo conectar a la base de datos', 'error');
                        setLoading(false);
                        return;
                    }
                    try {
                        const docRef = doc(db, `artifacts/${appId}/users/${userId}/metas`, id);
                        await deleteDoc(docRef);

                        const updatedMetas = metas.filter(item => item.id !== id);
                        setMetas(updatedMetas);
                        showNotification('Meta eliminada correctamente', 'success');
                    } catch (error) {
                        console.error('❌ Error al eliminar la meta:', error);
                        showNotification('Error al eliminar la meta', 'error');
                    }
                }
                setLoading(false);
            }
        } catch (error) {
            console.error('❌ Error en handleDelete de metas:', error);
            showNotification('Error inesperado al eliminar meta', 'error');
            setLoading(false);
        }
    };

    const handleSave = async (itemData) => {
        setLoading(true);
        
        let dataToSave = { ...itemData };
        dataToSave.currentAmount = dataToSave.currentAmount || 0;
        dataToSave.targetAmount = dataToSave.targetAmount || 0;
        dataToSave.date = new Date();

        if (isGuestMode && useLocalStorage) {
            // Modo invitado: usar localStorage
            const storageKey = 'nebula-metas';
            const storedData = localStorage.getItem(storageKey);
            let allData = storedData ? JSON.parse(storedData) : [];
            
            if (currentItem) {
                // Editar meta existente
                const index = allData.findIndex(item => item.id === currentItem.id);
                if (index !== -1) {
                    allData[index] = { ...allData[index], ...dataToSave };
                }
            } else {
                // Agregar nueva meta
                const maxOrder = allData.reduce((max, item) => ((item.order ?? 0) > max ? item.order : max), -1);
                dataToSave.order = maxOrder + 1;
                dataToSave.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                allData.push(dataToSave);
            }
            
            localStorage.setItem(storageKey, JSON.stringify(allData));

            setMetas(allData);
        } else {
            if (!db || !userId) {
                setLoading(false);
                return;
            }
            try {
                if (currentItem) {
                    // Editar meta existente
                    await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/metas`, currentItem.id), dataToSave);

                } else {
                    // Agregar nueva meta
                    const maxOrder = metas.reduce((max, item) => ((item.order ?? 0) > max ? item.order : max), -1);
                    dataToSave.order = maxOrder + 1;
                    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/metas`), dataToSave);

                }
            } catch (error) {
                console.error('Error al guardar meta:', error);
            }
        }
        
        setLoading(false);
        setIsModalOpen(false);
        setCurrentItem(null);
    };

    // Filtrar metas con valores válidos (misma lógica que MetasWidget)
    const validMetas = metas.filter(meta => meta.currentAmount >= 0 && meta.targetAmount > 0);

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-center items-center mb-6">
                <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary/80 transition-colors">
                    Agregar Meta
                </button>
            </div>
            
            <div className="grid gap-6">
                {validMetas.length > 0 ? validMetas.map(meta => (
                    <div key={meta.id} className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold text-text-primary">{meta.description}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(meta)} className="text-text-secondary hover:text-primary">
                                    <icons.edit className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(meta.id)} className="text-text-secondary hover:text-accent-magenta">
                                    <icons.trash className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        <GoalProgress meta={meta} currency={currency} dolarMep={dolarMep} />
                    </div>
                )) : (
                    <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border-color text-center">
                        <p className="text-text-secondary">No hay metas registradas.</p>
                    </div>
                )}
            </div>
            
            {isModalOpen && (
                <CrudModal 
                    item={currentItem} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSave} 
                    title="Metas" 
                    fieldsConfig={fieldsConfig} 
                    loading={loading} 
                />
            )}
        </div>
    );
};

const MainContent = () => {
    const { page, ingresos, gastos, deudas, inversiones, metas, setIngresos, setGastos, setDeudas, setInversiones, setMetas, confirmModal, selectedDate } = useContext(AppContext);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const configs = {
        ingresos: { title: "Ingresos", data: ingresos, setData: setIngresos, collectionName: "ingresos", fields: [{ name: 'description', label: 'Descripción' }, { name: 'amount', label: 'Monto', type: 'currency' }, { name: 'category', label: 'Categoría' }] },
       
        gastos: { title: "Gastos", data: gastos, setData: setGastos, collectionName: "gastos", fields: [{ name: 'description', label: 'Descripción' }, { name: 'amount', label: 'Monto', type: 'currency' }, { name: 'category', label: 'Categoría' }] },
        deudas: { title: "Deudas", data: deudas, setData: setDeudas, collectionName: "deudas", fields: [
            { name: 'description', label: 'Descripción' },
            { name: 'amount', label: 'Monto de deuda', type: 'currency' },
            { name: 'monthlyPayment', label: 'Cuota mensual', type: 'currency' },
            { name: 'paidAmount', label: 'Monto pagado', type: 'currency', defaultValue: 0 }
        ] },
        inversiones: { title: "Inversiones", data: inversiones, setData: setInversiones, collectionName: "inversiones", fields: [
            { name: 'description', label: 'Nombre de la inversión' },
            { name: 'type', label: 'Tipo de inversión', type: 'select', options: ['Renta Fija', 'Renta Variable', 'FCI', 'Otros'] },
            { name: 'amount', label: 'Monto de inversión', type: 'currency' }

        ] },
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <Dashboard />;
            case 'metas':
                return (
                    <div>
                        <div className="text-center mb-6 p-4 sm:p-8">
                            <h1 className="text-3xl font-bold text-text-primary mb-4">Metas</h1>
                            <button onClick={() => setIsCalendarOpen(true)} className="flex items-center gap-2 text-text-secondary bg-background-secondary border border-border-color rounded-lg px-3 py-1 shadow-sm hover:shadow-md hover:text-primary transform hover:-translate-y-0.5 transition-all duration-200 mx-auto">
                                <icons.calendar className="w-5 h-5"/>
                                <span>{new Date(selectedDate.year, selectedDate.month).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</span>
                            </button>
                        </div>
                        <MetasPage />
                    </div>
                );
            case 'ingresos':
            case 'gastos':
            case 'deudas':
            case 'inversiones': {
                const config = configs[page];
                return (
                    <div>
                        <div className="text-center mb-6 p-4 sm:p-8">
                            <h1 className="text-3xl font-bold text-text-primary mb-4">{config.title}</h1>
                            <button onClick={() => setIsCalendarOpen(true)} className="flex items-center gap-2 text-text-secondary bg-background-secondary border border-border-color rounded-lg px-3 py-1 shadow-sm hover:shadow-md hover:text-primary transform hover:-translate-y-0.5 transition-all duration-200 mx-auto">
                                <icons.calendar className="w-5 h-5"/>
                                <span>{new Date(selectedDate.year, selectedDate.month).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</span>
                            </button>
                        </div>
                        <CrudPage title={config.title} data={config.data} setData={config.setData} collectionName={config.collectionName} fieldsConfig={config.fields} />
                    </div>
                );
            }
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="bg-background-primary min-h-screen text-text-primary font-sans transition-colors duration-300">
            <main className="pb-28">
                {renderPage()}
            </main>
            <Dock />
            <NotificationModal />
            {confirmModal && (
                <ConfirmModal
                    isOpen={true}
                    onClose={confirmModal.onClose}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                />
            )}
            {isCalendarOpen && <CalendarModal onClose={() => setIsCalendarOpen(false)} />}
        </div>
       );
};

function AppContent() {
    const { userId, useLocalStorage, isGuestMode } = useContext(AppContext);
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@400;700&display=swap');
                :root {
                    --color-bg-primary: #e0f7fa; --color-bg-secondary: #fffde7; --color-bg-terciary: #fff8e1;
                    --color-text-primary: #3e2723; --color-text-secondary: #6d4c41;
                    --color-primary: #ff7043; --color-accent-gold: #ffca28; --color-accent-magenta: #ec407a;
                    --color-accent-cyan: #26c6da; --color-accent-green: #66bb6a; --color-border: #ffe0b2;
                }
                .dark {
                    --color-bg-primary: #0D1117; --color-bg-secondary: #161B22; --color-bg-terciary: #21262D;
                    --color-text-primary: #E6EDF3; --color-text-secondary: #8B949E;
                    --color-primary: #D4AF37; --color-accent-gold: #F0C674; --color-accent-magenta: #C389D9;
                    --color-accent-cyan: #79B8FF; --color-accent-green: #56D364; --color-border: #30363D;
                }
                body { font-family: 'Lato', sans-serif; }
                .bg-background-primary { background-color: var(--color-bg-primary); }
                .bg-background-secondary { background-color: var(--color-bg-secondary); }
                               .bg-background-terciary { background-color: var(--color-bg-terciary); }
                .text-text-primary { color: var(--color-text-primary); }
                .text-text-secondary { color: var(--color-text-secondary); }
                .bg-primary { background-color: var(--color-primary); }
                .text-primary { color: var(--color-primary); }
                .border-border-color { border-color: var(--color-border); }
                .hover\\:bg-primary\\/20:hover { background-color: color-mix(in srgb, var(--color-primary) 20%, transparent); }
                .focus\\:ring-primary:focus { --tw-ring-color: var(--color-primary); }
                .focus\\:border-primary:focus { border-color: var(--color-primary); }
                .text-accent-gold { color: var(--color-accent-gold); }
                .text-accent-magenta { color: var(--color-accent-magenta); }
                .text-accent-cyan { color: var(--color-accent-cyan); }
                .text-accent-green { color: var(--color-accent-green); }
                .from-accent-cyan { --tw-gradient-from: var(--color-accent-cyan) var(--tw-gradient-from-position); --tw-gradient-to: color-mix(in srgb, var(--color-accent-cyan) 0%, transparent) var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
                .to-primary { --tw-gradient-to: var(--color-primary) var(--tw-gradient-to-position); }
                .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                
                /* Drag and Drop Animations */
                .animate-drag-lift { animation: dragLift 0.2s ease-out; }
                @keyframes dragLift { 
                    from { transform: scale(1) rotate(0deg); box-shadow: 0 2px 4px rgba(0,0,0,0.1); } 
                    to { transform: scale(1.02) rotate(1deg); box-shadow: 0 8px 24px rgba(0,0,0,0.2); } 
                }
                
                .animate-drag-hover { animation: dragHover 0.3s ease-in-out infinite alternate; }
                @keyframes dragHover { 
                    from { transform: translateY(0px); } 
                    to { transform: translateY(-2px); } 
                }
                
                .animate-drop-zone { animation: dropZone 0.5s ease-in-out infinite; }
                @keyframes dropZone { 
                    0%, 100% { border-color: var(--color-primary); background-color: rgba(var(--color-primary-rgb), 0.05); }
                    50% { border-color: var(--color-accent-cyan); background-color: rgba(var(--color-accent-cyan-rgb), 0.1); }
                }
                
                .drag-ghost { 
                    opacity: 0.7; 
                    transform: rotate(5deg) scale(1.05); 
                    z-index: 1000; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3); 
                }
                
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .transition-width { transition: width 0.5s ease-in-out; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: var(--color-bg-terciary); }
                ::-webkit-scrollbar-thumb { background: var(--color-primary); border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color-primary) 80%, black); }
                .login-screen {
                    position: relative;
                    overflow: hidden;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: rgb(13 17 23);
                }

                .parallax {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    pointer-events: none;
                }

                .stars {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 200%;
                    height: 100%;
                    opacity: 0.8;
                    background-repeat: no-repeat;
                    background-position: 0 0;
                }

                .layer1 {
                    background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ffffff" opacity="0.1"/%3E%3C/svg%3E');
                    animation: moveStars 60s linear infinite;
                }

                .layer2 {
                    background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ffffff" opacity="0.2"/%3E%3C/svg%3E');
                    animation: moveStars 120s linear infinite;
                }

                .layer3 {
                    background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ffffff" opacity="0.3"/%3E%3C/svg%3E');
                    animation: moveStars 180s linear infinite;
                }

                @keyframes moveStars {
                    0% { background-position: 0 0; }
                    100% { background-position: 100% 100%; }
                }

                .login-modal {
                    position: relative;
                    z-index: 10;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    border-radius: 1rem;
                    padding: 2rem;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                }

                .login-modal h1 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                    color: #333;
                }

                .login-modal p {
                    margin-bottom: 2rem;
                    color: #666;
                }

                .login-modal button {
                    width: 100%;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background 0.3s;
                }

                .login-modal button:hover {
                    background: rgba(255, 105, 180, 0.1);
                }

                .login-modal .google-signin {
                    background: #4285F4;
                    color: white;
                    font-weight: bold;
                }

                .login-modal .guest-signin {
                    background: #34A853;
                    color: white;
                    font-weight: bold;
                }

                .login-modal .google-signin:hover {
                    background: #357ae8;
                }

                .login-modal .guest-signin:hover {
                    background: #28a745;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }

                .animate-slide-in {
                    animation: slideIn 0.5s ease-out;
                }
            `}</style>
            { (isGuestMode && useLocalStorage) || userId ? <MainContent /> : <WelcomeScreen /> }
        </>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}

const CalendarModal = ({ onClose }) => {
    const { selectedDate, setSelectedDate } = useContext(AppContext);
    const [displayYear, setDisplayYear] = useState(selectedDate.year);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const selectMonth = (monthIndex) => {
        setSelectedDate({ year: displayYear, month: monthIndex });
        onClose();
    };
    
    const years = Array.from({length: 2035 - 2023 + 1}, (_, i) => 2023 + i);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-background-secondary rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-primary/50">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setDisplayYear(y => y - 1)} className="p-2 rounded-full hover:bg-primary/20 transition-colors"><icons.chevronLeft className="w-6 h-6 text-primary"/></button>
                    <select value={displayYear} onChange={(e) => setDisplayYear(parseInt(e.target.value))} className="bg-background-terciary border border-border-color rounded-md p-1 focus:ring-primary focus:border-primary font-bold text-xl text-text-primary">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={() => setDisplayYear(y => y + 1)} className="p-2 rounded-full hover:bg-primary/20 transition-colors"><icons.chevronRight className="w-6 h-6 text-primary"/></button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    {monthNames.map((month, index) => {
                        const isSelected = displayYear === selectedDate.year && index === selectedDate.month;
                        return (
                            <button key={month} onClick={() => selectMonth(index)} 
                                className={`p-3 rounded-lg transition-all duration-200 ${isSelected ? 'bg-primary text-white font-bold shadow-lg' : 'bg-background-terciary hover:bg-primary/20'}`}>
                                {month}
                            </button>
                        )
                    })}
                </div>
                 <div className="text-center mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
