import { useState } from 'react';
import { convertirABase64, procesarImagenConVisionAPI, convertirPDFAImagen, procesarPDFCompleto, procesarArchivoCompatible, probarGoogleVisionAPI } from '../utils/visionOCR';

export default function ResumenTarjeta() {
  const [file, setFile] = useState(null);
  const [texto, setTexto] = useState('');
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [processingProgress, setProcessingProgress] = useState('');
  const [resumenCompleto, setResumenCompleto] = useState(null);
  const [testingAPI, setTestingAPI] = useState(false);

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']; // Temporalmente solo imágenes
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return 'Solo se permiten archivos de imagen (JPG, PNG). Para PDFs, convierte primero a imagen.';
    }

    if (file.size > maxSize) {
      return 'El archivo es demasiado grande. Máximo 10MB.';
    }

    return null;
  };

  const handleFileChange = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    // Validar archivo
    const validationError = validateFile(archivo);
    if (validationError) {
      setError(validationError);
      setTotal('Error de validación');
      setShowModal(true);
      return;
    }

    setFile(archivo);
    setLoading(true);
    setError('');
    setProcessingProgress('');
    setResumenCompleto(null);

    try {
      // Solo procesar imágenes por ahora
      const base64 = await convertirABase64(archivo);
      const text = await procesarImagenConVisionAPI(base64);
      setTexto(text);

      // Buscar totales con patrones mejorados
      const patterns = [
        /Total(?:\s+a\s+pagar)?[:\s]*\$?\s*([\d.,]+)/i,
        /Total[:\s]*\$?\s*([\d.,]+)/i,
        /Pagar[:\s]*\$?\s*([\d.,]+)/i,
        /Saldo[:\s]*\$?\s*([\d.,]+)/i,
        /Importe[:\s]*\$?\s*([\d.,]+)/i,
        /Nuevo\s+saldo[:\s]*\$?\s*([\d.,]+)/i,
        /Saldo\s+actual[:\s]*\$?\s*([\d.,]+)/i
      ];

      let matchFound = false;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          setTotal(match[1]);
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        setTotal('No detectado');
      }

      setShowModal(true);
    } catch (err) {
      console.error('Error OCR:', err);
      
      let errorMessage = err.message || 'Error al procesar la imagen';
      setError(errorMessage);
      setTotal('Error en el reconocimiento');
      setShowModal(true);
    } finally {
      setLoading(false);
      setProcessingProgress('');
    }
  };

  const handleTestAPI = async () => {
    setTestingAPI(true);
    setError('');
    
    try {
      const resultado = await probarGoogleVisionAPI();
      if (resultado.success) {
        setError('');
        setTotal('API funcionando ✅');
        setTexto('Prueba exitosa de Google Vision API');
        setShowModal(true);
      } else {
        setError(`Error en API: ${resultado.error}`);
        setTotal('Error en la API');
        setShowModal(true);
      }
    } catch (err) {
      setError(`Error ejecutando prueba: ${err.message}`);
      setTotal('Error en la prueba');
      setShowModal(true);
    } finally {
      setTestingAPI(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-background-secondary p-8 rounded-xl shadow-lg border border-border-color">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">📄 Procesador Inteligente de Resúmenes</h2>
          <p className="text-text-secondary">Sube tu resumen de tarjeta para extraer automáticamente el total y otra información importante con Google Vision AI</p>
          <p className="text-text-secondary text-sm mt-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <strong>✅ API Configurada:</strong> Google Vision AI está listo para procesar tus resúmenes de tarjeta. Sube una imagen (JPG/PNG) para extraer automáticamente el total a pagar y otra información.
          </p>
          
          {/* Botón de prueba de API */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-700 mb-2">
              <strong>🧪 Prueba rápida:</strong> Verifica que Google Vision API esté funcionando correctamente:
            </p>
            <button
              onClick={handleTestAPI}
              disabled={testingAPI || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {testingAPI ? 'Probando OCR...' : 'Probar OCR Real'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Seleccionar archivo
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border-2 border-dashed border-border-color rounded-lg bg-background-terciary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
            />
            <p className="text-xs text-text-secondary mt-2">
              Formatos soportados: JPG, PNG. 
              <br />
              <strong>Para PDFs:</strong> Convierte primero a imagen usando herramientas online o capturas de pantalla.
            </p>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 text-primary">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span className="font-medium">Procesando imagen con Google Vision AI...</span>
              </div>
              
              <p className="text-text-secondary text-sm mt-2">
                Extrayendo información del resumen de tarjeta...
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-500 text-sm font-medium">Error:</p>
            </div>
            <p className="text-red-500 text-sm mt-1">{error}</p>
            <div className="mt-2 text-xs text-red-400">
              <p><strong>Sugerencias:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>Para PDFs:</strong> Convierte a imagen (JPG/PNG) usando herramientas online</li>
                <li>Asegúrate de que la imagen sea clara y legible</li>
                <li>Usa buena iluminación al tomar fotos</li>
                <li>Evita archivos muy grandes (&gt;10MB)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
          <div className="bg-background-secondary rounded-xl shadow-2xl p-6 w-full max-w-md border border-border-color">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-accent-green/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-accent-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">📊 Resultado del OCR</h3>
            </div>
            
            <div className="space-y-4">
              {/* Información principal */}
              <div className="bg-background-terciary p-4 rounded-lg border border-border-color">
                <p className="text-sm text-text-secondary mb-1">Total a pagar:</p>
                <p className="text-2xl font-bold text-primary">
                  {total && total !== 'No detectado' && total !== 'Error en el reconocimiento' && total !== 'Error de validación' 
                    ? `$${total}` 
                    : total}
                </p>
              </div>
              
              {/* Información adicional para PDFs procesados completamente */}
              {resumenCompleto && resumenCompleto.informacionCompleta && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-text-primary border-b border-border-color pb-1">
                    📊 Información Completa del Resumen
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {resumenCompleto.pagoMinimo && resumenCompleto.pagoMinimo !== 'No detectado' && (
                      <div className="bg-green-500/10 p-3 rounded border border-green-500/20">
                        <p className="text-xs text-green-600 font-medium">Pago Mínimo</p>
                        <p className="text-green-700 font-semibold">${resumenCompleto.pagoMinimo}</p>
                      </div>
                    )}
                    
                    {resumenCompleto.fechaVencimiento && resumenCompleto.fechaVencimiento !== 'No detectada' && (
                      <div className="bg-red-500/10 p-3 rounded border border-red-500/20">
                        <p className="text-xs text-red-600 font-medium">Fecha de Vencimiento</p>
                        <p className="text-red-700 font-semibold">{resumenCompleto.fechaVencimiento}</p>
                      </div>
                    )}
                    
                    {resumenCompleto.informacionCompleta.limiteCredito && (
                      <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                        <p className="text-xs text-blue-600 font-medium">Límite de Crédito</p>
                        <p className="text-blue-700 font-semibold">${resumenCompleto.informacionCompleta.limiteCredito}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Estadísticas del procesamiento */}
                  <div className="bg-background-primary p-3 rounded border border-border-color">
                    <p className="text-xs text-text-secondary font-medium mb-2">📈 Estadísticas del Procesamiento</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-secondary">Páginas procesadas:</span>
                        <span className="ml-1 font-semibold text-text-primary">{resumenCompleto.estadisticas.paginasExitosas}/{resumenCompleto.estadisticas.totalPaginas}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Totales encontrados:</span>
                        <span className="ml-1 font-semibold text-text-primary">{resumenCompleto.estadisticas.totalesEncontrados}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}
              
              <p className="text-sm text-text-secondary text-center">
                {total === 'Error de validación' 
                  ? 'Por favor, usa solo archivos de imagen (JPG, PNG) o PDF'
                  : resumenCompleto 
                    ? `Información extraída de ${resumenCompleto.estadisticas.totalPaginas} páginas usando Google Vision AI`
                    : 'Este valor fue extraído automáticamente usando Google Vision AI'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(''); // Limpiar errores al cerrar
                  setTotal(null); // Limpiar total
                  setResumenCompleto(null); // Limpiar resumen completo
                  setProcessingProgress(''); // Limpiar progreso
                }}
                className="flex-1 px-4 py-2 bg-background-terciary text-text-primary rounded-md hover:bg-background-terciary/50 transition-colors"
              >
                Cerrar
              </button>
              {total && total !== 'No detectado' && total !== 'Error en el reconocimiento' && total !== 'Error de validación' && (
                <button
                  onClick={() => {
                    // Aquí podrías agregar lógica para usar el valor extraído
                    // Por ejemplo, agregarlo como un gasto automáticamente
                    console.log('Información completa del resumen:', resumenCompleto);
                    setShowModal(false);
                    setError(''); // Limpiar errores al cerrar
                    setResumenCompleto(null); // Limpiar resumen completo
                  }}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors"
                >
                  Usar Valor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
