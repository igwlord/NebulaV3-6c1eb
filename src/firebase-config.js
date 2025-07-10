// Configuración de Firebase con valores por defecto para demo
export const firebaseConfig = {
  apiKey: "AIzaSyDFzUOzQeYtnH5NEZpbNyrHZ4dnFbdji2k",
  authDomain: "nevula-v3.firebaseapp.com",
  projectId: "nevula-v3",
  storageBucket: "nevula-v3.firebasestorage.app",
  messagingSenderId: "11489294042",
  appId: "1:11489294042:web:f6de9544a999568dc6d7e3",
  measurementId: "G-3F9N3BF3Y2"
};

// ID de la aplicación
export const appId = "nebula-finance-app";

// Configurar variables globales para la aplicación
if (typeof window !== 'undefined') {
  window.__firebase_config = JSON.stringify(firebaseConfig);
  window.__app_id = appId;
}
