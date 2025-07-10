# 🔑 Configuración de Google Vision API

## ⚠️ Problema Actual
La API key en el archivo `.env` está **incompleta**:
```
VITE_GOOGLE_VISION_API_KEY=AIzaSyBI6lwYeoM-m8NQ0eHPkzs5Rq4b7yTTH_INCOMPLETA
```

## ✅ Solución: Obtener API Key Completa

### Paso 1: Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Crea un proyecto nuevo o selecciona uno existente

### Paso 2: Habilitar Cloud Vision API
1. Ve a [Habilitar Cloud Vision API](https://console.cloud.google.com/flows/enableapi?apiid=vision.googleapis.com)
2. Selecciona tu proyecto
3. Haz clic en "Habilitar"

### Paso 3: Crear Credenciales
1. Ve a [Credenciales](https://console.cloud.google.com/apis/credentials)
2. Haz clic en "Crear credenciales"
3. Selecciona "Clave de API"
4. Copia la clave completa (debe tener ~39 caracteres)

### Paso 4: Configurar en .env
Reemplaza en el archivo `.env`:
```env
# Antes (incompleta)
VITE_GOOGLE_VISION_API_KEY=AIzaSyBI6lwYeoM-m8NQ0eHPkzs5Rq4b7yTTH_INCOMPLETA

# Después (completa)
VITE_GOOGLE_VISION_API_KEY=AIzaSyDhVyxOaIm2WGJcDqFUH1uQyNw8pVh9R2k
```

### Paso 5: Reiniciar Servidor
```bash
# Detener servidor (Ctrl+C)
# Luego reiniciar
npm run dev
```

## 🎭 Modo Actual: Simulación
Mientras tanto, el sistema funciona en **modo demo** con datos simulados que muestran:
- ✅ Total a pagar: $172,430.50
- ✅ Pago mínimo: $8,621.53
- ✅ Fecha de vencimiento: 25/07/2024
- ✅ Límite de crédito: $500,000.00

## 🚀 Una vez configurado
Con la API key real podrás:
- 📸 Procesar imágenes reales de resúmenes
- 🔍 OCR avanzado con Google Vision AI
- 📊 Extraer información automáticamente
- 💯 Precisión real en lugar de simulación

## 💡 Costo
- Google Vision API: ~$1.50 por cada 1,000 imágenes
- Uso normal: prácticamente gratis para uso personal
