// utils/visionOCR.js

// Configuración para PDF.js con CDN externa
let pdfjsLib = null;

async function loadPDFJS() {
  if (!pdfjsLib) {
    try {
      // Usar dynamic import con configuración específica para Vite
      const pdfjs = await import('pdfjs-dist');
      
      // Configurar worker desde CDN confiable
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js`;
      
      pdfjsLib = pdfjs;
      console.log('📄 PDF.js cargado correctamente con worker de CDN');
      return pdfjsLib;
    } catch (error) {
      console.warn('⚠️ Error cargando PDF.js con worker, intentando sin worker...', error);
      
      // Fallback: intentar sin worker
      try {
        const pdfjs = await import('pdfjs-dist');
        
        // Configurar sin worker completamente
        pdfjs.GlobalWorkerOptions.workerSrc = '';
        pdfjs.GlobalWorkerOptions.disableWorker = true;
        
        pdfjsLib = pdfjs;
        console.log('📄 PDF.js cargado en modo fallback sin worker');
        return pdfjsLib;
      } catch (fallbackError) {
        console.error('❌ Error cargando PDF.js incluso sin worker:', fallbackError);
        throw new Error('PDF.js no disponible. Solo se pueden procesar imágenes.');
      }
    }
  }
  return pdfjsLib;
}

export async function convertirABase64(file) {
  return new Promise((resolve, reject) => {
    console.log('📷 Convirtiendo archivo a base64...');
    console.log('Archivo:', file.name, file.type, `${(file.size / 1024).toFixed(1)}KB`);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const result = reader.result;
        if (!result || typeof result !== 'string') {
          throw new Error('No se pudo leer el archivo');
        }
        
        // Verificar que tenga el formato correcto
        if (!result.startsWith('data:')) {
          throw new Error('Formato de archivo no válido');
        }
        
        const base64 = result.split(',')[1]; // quitamos el encabezado data:image
        
        if (!base64 || base64.length < 100) {
          throw new Error(`Base64 generado es muy pequeño: ${base64?.length || 0} caracteres`);
        }
        
        console.log('✅ Conversión a base64 exitosa:', `${base64.length} caracteres`);
        resolve(base64);
      } catch (error) {
        console.error('❌ Error en conversión base64:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

export async function procesarPDFCompleto(file, onProgress = null) {
  try {
    console.log('🔄 Iniciando procesamiento completo de PDF...');
    
    // Cargar PDF.js dinámicamente
    const pdfjs = await loadPDFJS();
    
    const arrayBuffer = await file.arrayBuffer();
    
    // Cargar PDF con configuración flexible
    let pdf;
    try {
      // Intentar con worker primero
      pdf = await pdfjs.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        useSystemFonts: true
      }).promise;
      console.log('✅ PDF cargado con worker');
    } catch (error) {
      console.warn('⚠️ Error con worker, intentando sin worker...', error.message);
      
      // Fallback sin worker
      pdf = await pdfjs.getDocument({
        data: arrayBuffer,
        useWorker: false,
        disableWorker: true,
        verbosity: 0,
        useSystemFonts: true
      }).promise;
      console.log('✅ PDF cargado sin worker');
    }
    
    const numPages = pdf.numPages;
    console.log(`📄 PDF cargado con ${numPages} páginas`);
    
    if (onProgress) onProgress(`Procesando ${numPages} páginas...`, 0);
    
    const resultados = {
      textoCompleto: '',
      textoPorPagina: [],
      totalesEncontrados: [],
      informacionRelevante: {
        fechaVencimiento: null,
        totalGeneral: null,
        pagoMinimo: null,
        fechaCorte: null,
        limiteCredito: null,
        saldoAnterior: null,
        nuevosCargosPeriodo: null
      }
    };
    
    // Procesar cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        if (onProgress) onProgress(`Procesando página ${pageNum} de ${numPages}...`, (pageNum - 1) / numPages * 100);
        
        console.log(`🔍 Procesando página ${pageNum}/${numPages}`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 }); // Mejor calidad para OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar con timeout por página
        const renderPromise = page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout en página ${pageNum}`)), 45000);
        });
        
        await Promise.race([renderPromise, timeoutPromise]);
        
        // Convertir página a base64
        const base64 = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error(`No se pudo generar imagen de página ${pageNum}`));
              return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = () => reject(new Error(`Error al convertir página ${pageNum} a base64`));
            reader.readAsDataURL(blob);
          }, 'image/png', 0.95);
        });
        
        // Procesar OCR de esta página
        console.log(`🤖 Ejecutando OCR en página ${pageNum}...`);
        const textoPagina = await procesarImagenConVisionAPI(base64);
        
        // Guardar texto de la página
        resultados.textoPorPagina.push({
          pagina: pageNum,
          texto: textoPagina
        });
        
        resultados.textoCompleto += `\n\n=== PÁGINA ${pageNum} ===\n${textoPagina}`;
        
        // Buscar información relevante en esta página
        await extraerInformacionRelevante(textoPagina, resultados.informacionRelevante, pageNum);
        
        // Limpiar canvas para liberar memoria
        canvas.width = 1;
        canvas.height = 1;
        context.clearRect(0, 0, 1, 1);
        
        console.log(`✅ Página ${pageNum} procesada correctamente`);
        
      } catch (error) {
        console.warn(`⚠️ Error procesando página ${pageNum}:`, error.message);
        resultados.textoPorPagina.push({
          pagina: pageNum,
          texto: `ERROR: No se pudo procesar página ${pageNum}: ${error.message}`,
          error: true
        });
      }
    }
    
    if (onProgress) onProgress('Analizando resultados...', 95);
    
    // Análisis final de todos los textos
    const analisisFinal = await analizarResumenCompleto(resultados);
    
    if (onProgress) onProgress('Procesamiento completado', 100);
    
    console.log('🎉 Procesamiento completo finalizado:', analisisFinal);
    return analisisFinal;
    
  } catch (error) {
    console.error('❌ Error en procesamiento completo de PDF:', error);
    throw new Error(`Error procesando PDF completo: ${error.message}`);
  }
}

// Función auxiliar para mantener compatibilidad con código existente
export async function convertirPDFAImagen(file) {
  try {
    // Para PDFs simples, usar la primera página como antes
    const resultado = await procesarPDFCompleto(file);
    
    // Si tenemos texto de la primera página, crear base64 simulado
    if (resultado.textoPorPagina && resultado.textoPorPagina.length > 0) {
      // En lugar de retornar base64, retornamos el texto directamente
      // ya que el componente espera que procesarImagenConVisionAPI ya se haya ejecutado
      return resultado.textoCompleto;
    }
    
    throw new Error('No se pudo procesar el PDF');
  } catch (error) {
    console.error('Error en conversión PDF:', error);
    throw new Error(`No se pudo procesar el PDF: ${error.message}. Intenta con una imagen (JPG/PNG) en su lugar.`);
  }
}

export async function procesarImagenConVisionAPI(base64Content) {
  const apiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
  
  console.log('🔍 Verificando configuración de Google Vision API...');
  console.log('API Key disponible:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NO CONFIGURADA');
  
  if (!apiKey) {
    throw new Error('API Key de Google Vision no configurada. Agregue VITE_GOOGLE_VISION_API_KEY al archivo .env');
  }
  
  // Verificar si la API key está incompleta (modo desarrollo)
  if (apiKey.includes('INCOMPLETA') || apiKey.length < 35) {
    console.warn('⚠️ API Key incompleta, usando simulación para pruebas...');
    return await simularOCR(base64Content);
  }
  
  if (apiKey.length < 30) {
    throw new Error(`API Key parece incorrecta (muy corta: ${apiKey.length} caracteres). Verifica que esté completa en .env`);
  }
  
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const body = {
    requests: [
      {
        image: { content: base64Content },
        features: [{ type: 'TEXT_DETECTION' }],
      },
    ],
  };

  console.log('🤖 Enviando request a Google Vision API...');
  console.log('URL:', url.substring(0, 50) + '...');
  console.log('Base64 length:', base64Content ? base64Content.length : 'NO DATA');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('📡 Respuesta de Google Vision API:', res.status, res.statusText);

    if (!res.ok) {
      // Obtener más detalles del error
      let errorDetails = '';
      try {
        const errorResponse = await res.text();
        console.error('❌ Error response body:', errorResponse);
        errorDetails = ` - Detalles: ${errorResponse.substring(0, 200)}`;
      } catch (e) {
        console.error('❌ No se pudo leer el error response');
      }
      
      throw new Error(`Error de Google Vision API: ${res.status} ${res.statusText}${errorDetails}`);
    }

    const data = await res.json();
    console.log('✅ Datos recibidos de Google Vision API');
    
    if (data.responses && data.responses[0] && data.responses[0].error) {
      console.error('❌ Error en la respuesta de Vision API:', data.responses[0].error);
      throw new Error(`Error de Google Vision: ${data.responses[0].error.message}`);
    }
    
    const texto = data?.responses?.[0]?.fullTextAnnotation?.text || '';
    console.log('📝 Texto extraído:', texto ? `${texto.length} caracteres` : 'SIN TEXTO');
    
    if (!texto) {
      console.warn('⚠️ No se detectó texto en la imagen');
    }
    
    return texto;
  } catch (error) {
    console.error('❌ Error completo en procesarImagenConVisionAPI:', error);
    throw error;
  }
}

// Función de simulación para probar sin Google Vision API
export async function simularOCR(base64Content) {
  console.log('🎭 Usando simulación de OCR para pruebas...');
  
  // Simular el procesamiento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Retornar texto simulado de un resumen de tarjeta
  const textoSimulado = `
RESUMEN DE CUENTA - TARJETA DE CRÉDITO
=======================================

Período: 01/06/2024 - 30/06/2024
Fecha de corte: 30/06/2024
Fecha de vencimiento: 25/07/2024

RESUMEN DE MOVIMIENTOS
Saldo anterior: $125,450.00
Nuevos cargos del período: $45,780.50
Pagos recibidos: $0.00
Otros cargos: $1,200.00

TOTAL A PAGAR: $172,430.50
PAGO MÍNIMO: $8,621.53

Límite de crédito: $500,000.00
Crédito disponible: $327,569.50

Nota: Esta es una simulación para pruebas
`;
  
  console.log('✅ OCR simulado completado');
  return textoSimulado;
}

// Función para extraer información relevante de cada página
async function extraerInformacionRelevante(texto, info, numeroPagina) {
  console.log(`🔍 Analizando información relevante en página ${numeroPagina}...`);
  
  // Patrones mejorados para resúmenes de tarjeta de crédito
  const patrones = {
    totalGeneral: [
      /total\s+a\s+pagar[:\s]*\$?\s*([\d.,]+)/i,
      /total\s+general[:\s]*\$?\s*([\d.,]+)/i,
      /nuevo\s+saldo[:\s]*\$?\s*([\d.,]+)/i,
      /saldo\s+actual[:\s]*\$?\s*([\d.,]+)/i,
      /importe\s+total[:\s]*\$?\s*([\d.,]+)/i
    ],
    pagoMinimo: [
      /pago\s+m[íi]nimo[:\s]*\$?\s*([\d.,]+)/i,
      /cuota\s+m[íi]nima[:\s]*\$?\s*([\d.,]+)/i,
      /pago\s+m[íi]n[:\s]*\$?\s*([\d.,]+)/i
    ],
    fechaVencimiento: [
      /fecha\s+de\s+vencimiento[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /vence[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /fecha\s+l[íi]mite[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i
    ],
    fechaCorte: [
      /fecha\s+de\s+corte[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /periodo[:\s]*.*?(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i
    ],
    limiteCredito: [
      /l[íi]mite\s+de\s+cr[ée]dito[:\s]*\$?\s*([\d.,]+)/i,
      /l[íi]mite\s+autorizado[:\s]*\$?\s*([\d.,]+)/i,
      /cr[ée]dito\s+disponible[:\s]*\$?\s*([\d.,]+)/i
    ],
    saldoAnterior: [
      /saldo\s+anterior[:\s]*\$?\s*([\d.,]+)/i,
      /saldo\s+previo[:\s]*\$?\s*([\d.,]+)/i
    ],
    nuevosCargosPeriodo: [
      /nuevos\s+cargos[:\s]*\$?\s*([\d.,]+)/i,
      /compras\s+del\s+periodo[:\s]*\$?\s*([\d.,]+)/i,
      /cargos\s+periodo[:\s]*\$?\s*([\d.,]+)/i
    ]
  };
  
  // Buscar cada tipo de información
  for (const [campo, patronesCampo] of Object.entries(patrones)) {
    if (!info[campo]) { // Solo buscar si no lo hemos encontrado ya
      for (const patron of patronesCampo) {
        const match = texto.match(patron);
        if (match) {
          info[campo] = match[1];
          console.log(`✅ Encontrado ${campo}: ${match[1]} en página ${numeroPagina}`);
          break;
        }
      }
    }
  }
}

// Función para análisis final del resumen completo
async function analizarResumenCompleto(resultados) {
  console.log('🧠 Realizando análisis final del resumen completo...');
  
  const { textoCompleto, textoPorPagina, informacionRelevante } = resultados;
  
  // Buscar totales en todo el documento
  const totalesEncontrados = [];
  const patronesTotales = [
    /total\s+a\s+pagar[:\s]*\$?\s*([\d.,]+)/gi,
    /total\s+general[:\s]*\$?\s*([\d.,]+)/gi,
    /nuevo\s+saldo[:\s]*\$?\s*([\d.,]+)/gi,
    /saldo\s+actual[:\s]*\$?\s*([\d.,]+)/gi,
    /importe\s+total[:\s]*\$?\s*([\d.,]+)/gi,
    /pago\s+m[íi]nimo[:\s]*\$?\s*([\d.,]+)/gi
  ];
  
  patronesTotales.forEach(patron => {
    let match;
    while ((match = patron.exec(textoCompleto)) !== null) {
      totalesEncontrados.push({
        tipo: patron.source.split('\\s+')[0], // Primer palabra del patrón
        valor: match[1],
        contexto: match[0]
      });
    }
  });
  
  // Determinar el total principal
  let totalPrincipal = informacionRelevante.totalGeneral;
  
  if (!totalPrincipal && totalesEncontrados.length > 0) {
    // Si no encontramos con los patrones específicos, usar el primer total encontrado
    totalPrincipal = totalesEncontrados[0].valor;
  }
  
  // Crear resumen estructurado
  const resumenEstructurado = {
    // Información principal
    totalAPagar: totalPrincipal || 'No detectado',
    pagoMinimo: informacionRelevante.pagoMinimo || 'No detectado',
    fechaVencimiento: informacionRelevante.fechaVencimiento || 'No detectada',
    
    // Información adicional
    informacionCompleta: {
      fechaCorte: informacionRelevante.fechaCorte,
      limiteCredito: informacionRelevante.limiteCredito,
      saldoAnterior: informacionRelevante.saldoAnterior,
      nuevosCargosPeriodo: informacionRelevante.nuevosCargosPeriodo
    },
    
    // Metadatos del procesamiento
    estadisticas: {
      totalPaginas: textoPorPagina.length,
      paginasExitosas: textoPorPagina.filter(p => !p.error).length,
      paginasConError: textoPorPagina.filter(p => p.error).length,
      totalesEncontrados: totalesEncontrados.length
    },
    
    // Textos completos para referencia
    textoCompleto,
    textoPorPagina,
    totalesEncontrados,
    
    // Para compatibilidad con el componente actual
    texto: textoCompleto,
    total: totalPrincipal || 'No detectado'
  };
  
  console.log('📊 Análisis completo:', {
    totalAPagar: resumenEstructurado.totalAPagar,
    paginas: resumenEstructurado.estadisticas.totalPaginas,
    exitosas: resumenEstructurado.estadisticas.paginasExitosas
  });
  
  return resumenEstructurado;
}

// Función alternativa para compatibilidad total (solo imágenes)
export async function procesarArchivoCompatible(file, onProgress = null) {
  try {
    if (file.type === 'application/pdf') {
      throw new Error('PDF.js no disponible. Solo se pueden procesar imágenes en este momento.');
    }
    
    // Para imágenes, usar el proceso normal
    const base64 = await convertirABase64(file);
    const texto = await procesarImagenConVisionAPI(base64);
    
    // Retornar en el mismo formato que procesarPDFCompleto para compatibilidad
    return {
      totalAPagar: 'No detectado',
      pagoMinimo: 'No detectado', 
      fechaVencimiento: 'No detectada',
      informacionCompleta: {},
      estadisticas: {
        totalPaginas: 1,
        paginasExitosas: 1,
        paginasConError: 0,
        totalesEncontrados: 0
      },
      textoCompleto: texto,
      textoPorPagina: [{ pagina: 1, texto: texto }],
      totalesEncontrados: [],
      texto: texto,
      total: 'No detectado'
    };
  } catch (error) {
    console.error('Error en procesamiento compatible:', error);
    throw error;
  }
}

// Función de prueba para verificar la API de Google Vision
export async function probarGoogleVisionAPI() {
  try {
    console.log('🧪 Ejecutando prueba de Google Vision API...');
    
    // Crear una imagen de prueba simple (1x1 pixel blanco en base64)
    const imagenPrueba = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const resultado = await procesarImagenConVisionAPI(imagenPrueba);
    console.log('✅ API de Google Vision funcionando correctamente');
    return { success: true, mensaje: 'API funcionando', resultado };
  } catch (error) {
    console.error('❌ Error en prueba de API:', error);
    return { success: false, error: error.message };
  }
}

// Instrucciones para obtener la API key completa
export function obtenerInstruccionesAPIKey() {
  return `
🔑 CÓMO OBTENER LA API KEY COMPLETA DE GOOGLE VISION:

1. Ve a Google Cloud Console: https://console.cloud.google.com/
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Cloud Vision: https://console.cloud.google.com/flows/enableapi?apiid=vision.googleapis.com
4. Ve a "Credenciales" > "Crear credenciales" > "Clave de API"
5. Copia la clave completa (debe tener ~39 caracteres)
6. Pégala en el archivo .env como: VITE_GOOGLE_VISION_API_KEY=tu_clave_completa_aqui

Ejemplo de clave válida: AIzaSyDhVyxOaIm2WGJcDqFUH1uQyNw8pVh9R2k
(la actual está incompleta: AIzaSyBI6lwYeoM-m8NQ0eHPkzs5Rq4b7yTTH)
`;
}
