// Configuración de Firebase con valores por defecto para demo
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nebula-v3-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nebula-v3-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nebula-v3-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DEMO"
};

// ID de la aplicación
export const appId = "nebula-finance-app";

// Configurar variables globales para la aplicación
if (typeof window !== 'undefined') {
  window.__firebase_config = JSON.stringify(firebaseConfig);
  window.__app_id = appId;
}
