import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom'; // 👈 añadimos routing
import { AuthWrapper } from './components/AuthWrapper';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ParentHeader } from './components/ParentHeader';
import { InscripcionComedorForm } from './components/InscripcionComedorForm';
import { InscripcionComedorPadreForm } from './components/InscripcionComedorPadreForm';
import { InscripcionesUnificadas } from './components/InscripcionesUnificadas';
import { BajaForm } from './components/BajaForm';
import { BajasList } from './components/BajasList';
import { SolicitudForm } from './components/SolicitudForm';
import { SolicitudesList } from './components/SolicitudesList';
import { MenuEleccionForm } from './components/MenuEleccionForm';
import { MenuEleccionesList } from './components/MenuEleccionesList';
import { EnfermedadForm } from './components/EnfermedadForm';
import { EnfermedadesList } from './components/EnfermedadesList';
import { FacturacionView } from './components/FacturacionView';
import { InvitacionesView } from './components/InvitacionesView';
import { RestriccionesDieteticasHijo } from './components/RestriccionesDieteticasHijo';
import { PerfilPadre } from './components/PerfilPadre';
import { CambiarPasswordPadre } from './components/CambiarPasswordPadre';
import { SuccessMessage } from './components/SuccessMessage';
import { MenusDashboard } from './components/MenusDashboard';
import { useInscripcionesComedor } from './hooks/useInscripcionesComedor';
import { useInscripcionesPadres } from './hooks/useInscripcionesPadres';
import { useBajas } from './hooks/useBajas';
import { useSolicitudes } from './hooks/useSolicitudes';
import { useMenuElecciones } from './hooks/useMenuElecciones';
import { useEnfermedades } from './hooks/useEnfermedades';
import { User } from '@supabase/supabase-js';
import { formatDateForDisplay } from './utils/dateUtils';

// 👇 página pública para fijar contraseña
import ResetPassword from './pages/ResetPassword';

function AppContent({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'home' | 'inscripcion' | 'bajas' | 'solicitudes' | 'menu' | 'enfermedades' | 'facturacion' | 'invitaciones' | 'restricciones' | 'perfil' | 'password'>('home');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [displayTitle, setDisplayTitle] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const {
    inscripciones,
    hijos: hijosInscripcion,
    loading: loadingInscripcion,
    saveInscripcion,
    desactivarInscripcion,
    calcularPrecioMensual
  } = useInscripcionesComedor(user);
  const {
    inscripciones: inscripcionesPadre,
    padre,
    loading: loadingPadre,
    saveInscripcion: saveInscripcionPadre,
    desactivarInscripcion: desactivarInscripcionPadre,
    calcularPrecioMensual: calcularPrecioMensualPadre
  } = useInscripcionesPadres(user);

  const padreStable = useMemo(() => padre, [padre?.id]);
  const inscripcionesPadreStable = useMemo(() => inscripcionesPadre, [JSON.stringify(inscripcionesPadre?.map(i => i.id))]);

  const { bajas, hijos, loading, diasAntelacion, createBaja, deleteBaja, canCancelBaja } = useBajas(user, padreStable, inscripcionesPadreStable);
  const { solicitudes, hijos: hijosForSolicitudes, inscripciones: inscripcionesForSolicitudes, loading: loadingSolicitudes, diasAntelacion: diasAntelacionSolicitudes, createSolicitud, deleteSolicitud, canCancelSolicitud } = useSolicitudes(user, padreStable, inscripcionesPadreStable);
  const {
    elecciones,
    hijos: hijosForMenu,
    personasUnificadas,
    opcionesGuarnicion,
    getOpcionesPorDia,
    loading: loadingMenu,
    diasAntelacion: diasAntelacionMenu,
    saveEleccionMenu,
    deleteEleccionMenu,
    canCancelEleccionMenu
  } = useMenuElecciones(user, padreStable, inscripcionesPadreStable);
  const {
    enfermedades,
    hijos: hijosForEnfermedades,
    loading: loadingEnfermedades,
    diasAntelacion: diasAntelacionEnfermedades,
    createEnfermedad,
    deleteEnfermedad,
    canCancelEnfermedad
  } = useEnfermedades(user, padreStable, inscripcionesPadreStable);

  React.useEffect(() => {
    if (!loadingInscripcion && !loadingPadre && !loading && !loadingSolicitudes && !loadingMenu && !loadingEnfermedades) {
      setIsInitialLoadComplete(true);
    }
  }, [loadingInscripcion, loadingPadre, loading, loadingSolicitudes, loadingMenu, loadingEnfermedades]);

  const handleInscripcionPadreSubmit = async (formData: { diasSemana: number[]; fechaInicio: string }) => {
    try {
      setSubmitting(true);
      await saveInscripcionPadre(formData.diasSemana, formData.fechaInicio);

      const diasTexto = formData.diasSemana.map(d => {
        const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        return dias[d];
      }).join(', ');

      const fechaInicioTexto = new Date(formData.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
      });
      setSuccessMessage(`Tu inscripción al comedor ha sido guardada para los días: ${diasTexto}. Servicio inicia el ${fechaInicioTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Inscripción guardada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al guardar tu inscripción:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDesactivarInscripcionPadre = async (id: string) => {
    try {
      await desactivarInscripcionPadre(id);
    } catch (error) {
      console.error('Error al desactivar tu inscripción:', error);
    }
  };

  const handleInscripcionSubmit = async (formData: { hijoId: string; diasSemana: number[]; fechaInicio: string }) => {
    try {
      setSubmitting(true);
      await saveInscripcion(formData.hijoId, formData.diasSemana, formData.fechaInicio);
      
      const hijo = hijosInscripcion.find(h => h.id === formData.hijoId);
      const diasTexto = formData.diasSemana.map(d => {
        const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        return dias[d];
      }).join(', ');
      
      const fechaInicioTexto = new Date(formData.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', { 
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' 
      });
      setSuccessMessage(`Inscripción guardada para ${hijo?.nombre} (${hijo?.grado?.nombre}) los días: ${diasTexto}. Servicio inicia el ${fechaInicioTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Inscripción guardada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al guardar la inscripción:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDesactivarInscripcion = async (id: string) => {
    try {
      await desactivarInscripcion(id);
    } catch (error) {
      console.error('Error al desactivar la inscripción:', error);
    }
  };

  const handleBajaSubmit = async (formData: { hijoId: string; fechas: string[] }) => {
    try {
      setSubmitting(true);
      await createBaja(formData.hijoId, formData.fechas);

      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === formData.hijoId;
      let nombrePersona = '';
      let detalle = '';

      if (isPadre) {
        nombrePersona = padre?.nombre || '';
        detalle = '(Personal del colegio)';
      } else {
        const hijo = hijos.find(h => h.id === formData.hijoId);
        nombrePersona = hijo?.nombre || '';
        detalle = `(${hijo?.grado?.nombre || ''})`;
      }

      const fechasTexto = formData.fechas.map(fecha => {
        const date = new Date(fecha);
        return formatDateForDisplay(date);
      }).join(', ');
      setSuccessMessage(`Baja registrada para ${nombrePersona} ${detalle} los días: ${fechasTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Baja comunicada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al crear la baja:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBaja = async (id: string) => {
    try {
      setSubmitting(true);
      await deleteBaja(id);

      const baja = bajas.find(b => b.id === id);
      const nombrePersona = baja?.hijo || '';
      const fechaTexto = baja?.dias.join(', ') || '';

      setSuccessMessage(`Baja cancelada exitosamente para ${nombrePersona}. El servicio de comedor se reanudará el ${fechaTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Baja cancelada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al cancelar la baja:', error);
      setSuccessMessage(error instanceof Error ? error.message : 'Error al cancelar la baja');
      setMessageType('error');
      setDisplayTitle('No se pudo cancelar la baja');
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSolicitudSubmit = async (formData: { hijoId: string; fechas: string[] }) => {
    try {
      setSubmitting(true);
      await createSolicitud(formData.hijoId, formData.fechas);

      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === formData.hijoId;
      let nombrePersona = '';
      let detalle = '';

      if (isPadre) {
        nombrePersona = padre?.nombre || '';
        detalle = '(Personal del colegio)';
      } else {
        const hijo = hijosForSolicitudes.find(h => h.id === formData.hijoId);
        nombrePersona = hijo?.nombre || '';
        detalle = `(${hijo?.grado?.nombre || ''})`;
      }

      const fechasTexto = formData.fechas.map(fecha => {
        const date = new Date(fecha);
        return formatDateForDisplay(date);
      }).join(', ');
      setSuccessMessage(`Solicitud enviada para ${nombrePersona} ${detalle} los días: ${fechasTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Solicitud enviada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al crear la solicitud:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSolicitud = async (id: string) => {
    try {
      setSubmitting(true);
      await deleteSolicitud(id);

      const solicitud = solicitudes.find(s => s.id === id);
      const nombrePersona = solicitud?.hijo || '';
      const fechaTexto = solicitud?.fecha || '';

      setSuccessMessage(`Solicitud cancelada exitosamente para ${nombrePersona}. La comida del ${fechaTexto} no será servida`);
      setMessageType('success');
      setDisplayTitle('¡Solicitud cancelada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al cancelar la solicitud:', error);
      setSuccessMessage(error instanceof Error ? error.message : 'Error al cancelar la solicitud');
      setMessageType('error');
      setDisplayTitle('No se pudo cancelar la solicitud');
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMenuSubmit = async (formData: { 
    hijoId: string; 
    fecha: string; 
    opcionPrincipalId: string; 
    opcionGuarnicionId: string; 
  }) => {
    try {
      setSubmitting(true);
      await saveEleccionMenu(
        formData.hijoId, 
        formData.fecha, 
        formData.opcionPrincipalId, 
        formData.opcionGuarnicionId
      );
      
      const hijo = hijosForMenu.find(h => h.id === formData.hijoId);
      const fecha = new Date(formData.fecha + 'T00:00:00');
      const fechaTexto = formatDateForDisplay(fecha);
      setSuccessMessage(`Menú guardado para ${hijo?.nombre} (${hijo?.grado?.nombre}) el ${fechaTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Menú guardado!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al guardar la elección de menú:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      setSubmitting(true);
      await deleteEleccionMenu(id);

      const eleccion = elecciones.find(e => e.id === id);
      const nombrePersona = eleccion?.hijo_details?.nombre || eleccion?.padre_details?.nombre || '';
      const fechaTexto = eleccion?.fecha || '';

      setSuccessMessage(`Elección de menú cancelada exitosamente para ${nombrePersona}. Se servirá el menú estándar el ${fechaTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Elección cancelada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al cancelar la elección de menú:', error);
      setSuccessMessage(error instanceof Error ? error.message : 'Error al cancelar la elección de menú');
      setMessageType('error');
      setDisplayTitle('No se pudo cancelar la elección');
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnfermedadSubmit = async (formData: {
    hijoId: string;
    fechasDietaBlanda: string[];
  }) => {
    try {
      setSubmitting(true);
      await createEnfermedad(formData);

      // Verificar si es el padre o un hijo
      const isPadre = padre?.id === formData.hijoId;
      let nombrePersona = '';
      let detalle = '';

      if (isPadre) {
        nombrePersona = padre?.nombre || '';
        detalle = '(Personal del colegio)';
      } else {
        const hijo = hijosForEnfermedades.find(h => h.id === formData.hijoId);
        nombrePersona = hijo?.nombre || '';
        detalle = `(${hijo?.grado?.nombre || ''})`;
      }

      const diasTexto = formData.fechasDietaBlanda.map(dia => {
        const date = new Date(dia + 'T00:00:00');
        return formatDateForDisplay(date);
      }).join(', ');
      const mensaje = `Dieta blanda solicitada para ${nombrePersona} ${detalle} los días: ${diasTexto}`;

      setSuccessMessage(mensaje);
      setMessageType('success');
      setDisplayTitle('¡Dieta blanda solicitada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al comunicar la enfermedad:', error);
      if (error instanceof Error) {
        setSuccessMessage(error.message);
        setMessageType('error');
        setDisplayTitle('Error al solicitar dieta blanda');
        setShowSuccess(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEnfermedad = async (id: string) => {
    try {
      setSubmitting(true);
      await deleteEnfermedad(id);

      const enfermedad = enfermedades.find(e => e.id === id);
      const nombrePersona = enfermedad?.hijo || '';
      const fechaTexto = enfermedad?.fecha_dieta_blanda ? new Date(enfermedad.fecha_dieta_blanda + 'T00:00:00').toLocaleDateString('es-ES') : '';

      setSuccessMessage(`Solicitud de dieta blanda cancelada exitosamente para ${nombrePersona}. Se servirá el menú normal el ${fechaTexto}`);
      setMessageType('success');
      setDisplayTitle('¡Solicitud cancelada!');
      setShowSuccess(true);
    } catch (error) {
      console.error('Error al cancelar la solicitud de dieta blanda:', error);
      setSuccessMessage(error instanceof Error ? error.message : 'Error al cancelar la solicitud de dieta blanda');
      setMessageType('error');
      setDisplayTitle('No se pudo cancelar la solicitud');
      setShowSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isInitialLoadComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <p className="ml-4 text-gray-600">Cargando datos...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!inscripciones || !hijosInscripcion || !inscripcionesPadre) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error al cargar los datos. Por favor, intenta cerrar sesión y volver a iniciar sesión.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <ParentHeader activeTab={activeTab} onTabChange={setActiveTab} />

    <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">

        {activeTab === 'home' ? (
          <MenusDashboard />
        ) : activeTab === 'inscripcion' ? (
          <>
            {padre?.es_personal && (
              <InscripcionComedorPadreForm
                onSubmit={handleInscripcionPadreSubmit}
                hasActiveInscripcion={inscripcionesPadre.some(i => i.activo)}
                isSubmitting={submitting}
                nombrePadre={padre?.nombre}
              />
            )}

            <InscripcionComedorForm
              onSubmit={handleInscripcionSubmit}
              hijos={hijosInscripcion}
              inscripciones={inscripciones}
              isSubmitting={submitting}
            />

            <InscripcionesUnificadas
              inscripcionesHijos={inscripciones}
              inscripcionesPadre={inscripcionesPadre}
              onDesactivarHijo={handleDesactivarInscripcion}
              onDesactivarPadre={handleDesactivarInscripcionPadre}
              calcularPrecioMensualHijo={calcularPrecioMensual}
              calcularPrecioMensualPadre={calcularPrecioMensualPadre}
              nombrePadre={padre?.nombre || ''}
              esPersonal={padre?.es_personal || false}
            />
          </>
        ) : activeTab === 'bajas' ? (
          <>
            <BajaForm
              onSubmit={handleBajaSubmit}
              hijos={hijos}
              bajas={bajas}
              inscripciones={inscripciones}
              inscripcionesPadre={inscripcionesPadre}
              nombrePadre={padre?.nombre}
              padreId={padre?.id}
              isSubmitting={submitting}
              diasAntelacion={diasAntelacion}
            />

            <BajasList
              bajas={bajas}
              diasAntelacion={diasAntelacion}
              onDelete={handleDeleteBaja}
              canCancelBaja={canCancelBaja}
            />
          </>
        ) : activeTab === 'solicitudes' ? (
          <>
            <SolicitudForm
              onSubmit={handleSolicitudSubmit}
              hijos={hijosForSolicitudes}
              solicitudes={solicitudes}
              inscripciones={inscripcionesForSolicitudes}
              inscripcionesPadre={inscripcionesPadre}
              nombrePadre={padre?.nombre}
              padreId={padre?.id}
              isSubmitting={submitting}
              diasAntelacion={diasAntelacionSolicitudes}
            />
            
            <SolicitudesList
              solicitudes={solicitudes}
              diasAntelacion={diasAntelacionSolicitudes}
              onDelete={handleDeleteSolicitud}
              canCancelSolicitud={canCancelSolicitud}
            />
          </>
        ) : activeTab === 'menu' ? (
          <>
            <MenuEleccionForm
              onSubmit={handleMenuSubmit}
              personasUnificadas={personasUnificadas}
              opcionesGuarnicion={opcionesGuarnicion}
              getOpcionesPorDia={getOpcionesPorDia}
              elecciones={elecciones}
              inscripciones={inscripciones}
              inscripcionesPadre={inscripcionesPadre}
              solicitudes={solicitudes}
              padreId={padre?.id}
              isSubmitting={submitting}
              diasAntelacion={diasAntelacionMenu}
            />
            
            <MenuEleccionesList
              elecciones={elecciones}
              diasAntelacion={diasAntelacionMenu}
              onDelete={handleDeleteMenu}
              canCancelEleccionMenu={canCancelEleccionMenu}
            />
          </>
        ) : activeTab === 'enfermedades' ? (
          <>
            <EnfermedadForm
              onSubmit={handleEnfermedadSubmit}
              hijos={hijosForEnfermedades}
              enfermedades={enfermedades}
              inscripciones={inscripciones}
              inscripcionesPadre={inscripcionesPadre}
              solicitudes={solicitudes}
              nombrePadre={padre?.nombre}
              padreId={padre?.id}
              isSubmitting={submitting}
              diasAntelacion={diasAntelacionEnfermedades}
            />

            <EnfermedadesList
              enfermedades={enfermedades}
              diasAntelacion={diasAntelacionEnfermedades}
              onDelete={handleDeleteEnfermedad}
              canCancelEnfermedad={canCancelEnfermedad}
            />
          </>
        ) : activeTab === 'facturacion' ? (
          <FacturacionView user={user} />
        ) : activeTab === 'invitaciones' ? (
          <InvitacionesView />
        ) : activeTab === 'restricciones' ? (
          <RestriccionesDieteticasHijo />
        ) : activeTab === 'perfil' ? (
          <PerfilPadre user={user} />
        ) : activeTab === 'password' ? (
          <CambiarPasswordPadre />
        ) : null}
      </div>
    </main>

    <SuccessMessage 
      show={showSuccess}
      onClose={() => setShowSuccess(false)}
      message={successMessage}
      type={messageType}
      displayTitle={displayTitle}
    />
    </>
  );
}

// 👇 tu app protegida entera, igual que antes, pero separada para enrutar
function ProtectedApp() {
  return (
    <AuthWrapper>
      {(user) => <AppContent user={user} />}
    </AuthWrapper>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Ruta pública para establecer nueva contraseña */}
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Resto de rutas protegidas por AuthWrapper */}
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </ErrorBoundary>
  );
}
