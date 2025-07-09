# Nebula V3 - Aplicación Financiera Personal

Una elegante aplicación web para gestión de finanzas personales con dashboards interactivos, seguimiento de gastos, metas financieras y más.

## ✨ Características

- 📊 **Dashboard Interactivo** - Visualiza tu situación financiera de un vistazo
- 💰 **Gestión de Ingresos y Gastos** - Registra y categoriza tus transacciones
- 🎯 **Metas Financieras** - Define y sigue el progreso de tus objetivos
- 💳 **Seguimiento de Deudas** - Controla tus deudas y pagos
- 📈 **Gestión de Inversiones** - Registra tus inversiones y rendimientos
- 🌙 **Modo Oscuro/Claro** - Interfaz adaptable a tus preferencias
- 🔒 **Modo Privacidad** - Oculta valores sensibles
- 👤 **Modo Invitado** - Prueba la app sin registro
- 🔐 **Autenticación con Google** - Acceso seguro con tu cuenta Google

## 🚀 Demo

Puedes probar la aplicación en modo invitado sin necesidad de registro: [https://nebula-v3.netlify.app](https://nebula-v3.netlify.app)

## 🛠️ Tecnologías

- **Frontend**: React 18, Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **Charts**: Recharts
- **Hosting**: Netlify

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/igwlord/NebulaV3.git
cd NebulaV3
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (opcional para modo local):
```bash
cp .env.example .env
# Edita .env con tus credenciales de Firebase
```

4. Ejecuta el proyecto:
```bash
npm run dev
```

## ⚙️ Configuración de Firebase (Opcional)

Si quieres usar tu propia instancia de Firebase:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication (Google Sign-in)
3. Crea una base de datos Firestore
4. Obtén las credenciales de configuración
5. Agrégalas como variables de entorno en Netlify o en tu `.env`

### Variables de Entorno

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 🌐 Deploy en Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/igwlord/NebulaV3)

### Deploy Manual

1. Build del proyecto:
```bash
npm run build
```

2. Sube la carpeta `dist` a Netlify

## 📱 Modo Invitado

La aplicación funciona completamente sin configuración de Firebase gracias al modo invitado:
- Los datos se almacenan en localStorage
- Incluye datos de ejemplo automáticos
- Todas las funcionalidades disponibles
- Perfecto para demos y pruebas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- Iconos de [Lucide React](https://lucide.dev/)
- Fuentes de [Google Fonts](https://fonts.google.com/)
- Inspiración de diseño moderno y minimalista

---

Desarrollado con ❤️ por [igwlord](https://github.com/igwlord)
