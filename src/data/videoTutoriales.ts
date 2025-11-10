export interface VideoTutorial {
  id: string;
  titulo: string;
  descripcion: string;
  videoUrl: string;
  portadaUrl: string;
  categoria: 'configuracion' | 'primeros-pasos' | 'funcionalidades';
  orden: number;
}

export const categorias = {
  configuracion: {
    id: 'configuracion',
    nombre: 'Configuración Inicial',
    descripcion: 'Prepara tu navegador para acceder a la plataforma',
    icono: 'settings'
  },
  'primeros-pasos': {
    id: 'primeros-pasos',
    nombre: 'Primeros Pasos',
    descripcion: 'Aprende a crear y gestionar tu cuenta',
    icono: 'user'
  },
  funcionalidades: {
    id: 'funcionalidades',
    nombre: 'Funcionalidades del Comedor',
    descripcion: 'Descubre todas las opciones disponibles',
    icono: 'utensils'
  }
};

export const videoTutoriales: VideoTutorial[] = [
  {
    id: '1-chrome',
    titulo: 'Instalar en Google Chrome',
    descripcion: 'Aprende a instalar la aplicación del comedor en tu navegador Chrome para un acceso más rápido',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/1_instalar_chrome.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/1_instalar_chrome.jpg',
    categoria: 'configuracion',
    orden: 1
  },
  {
    id: '1-safari',
    titulo: 'Instalar en Safari (iOS)',
    descripcion: 'Guía paso a paso para instalar la aplicación en tu iPhone o iPad usando Safari',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/1_instalar_safari.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/1_instalar_safari.jpg',
    categoria: 'configuracion',
    orden: 2
  },
  {
    id: '2-registro',
    titulo: 'Registrar tu Usuario',
    descripcion: 'Crea tu cuenta en la plataforma del comedor escolar de forma sencilla',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/2_registrar_usuario.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/2_registrar_usuario.jpg',
    categoria: 'primeros-pasos',
    orden: 3
  },
  {
    id: '3-cambiar-password',
    titulo: 'Cambiar tu Contraseña',
    descripcion: 'Modifica tu contraseña de forma segura desde tu perfil',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/3_cambiar_password.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/3_cambiar_password.jpg',
    categoria: 'primeros-pasos',
    orden: 4
  },
  {
    id: '4-olvide-password',
    titulo: 'Recuperar Contraseña Olvidada',
    descripcion: 'Recupera el acceso a tu cuenta si has olvidado tu contraseña',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/4_olvide_password.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/4_olvide_password.jpg',
    categoria: 'primeros-pasos',
    orden: 5
  },
  {
    id: '5-cambiar-datos',
    titulo: 'Actualizar tus Datos Personales',
    descripcion: 'Mantén tu información de contacto siempre actualizada',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/5_cambiar_datos.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/5_cambiar_datos.jpg',
    categoria: 'primeros-pasos',
    orden: 6
  },
  {
    id: '6-comunicar-baja',
    titulo: 'Comunicar una Baja',
    descripcion: 'Informa cuando tu hijo no asistirá al comedor de forma puntual',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/6_comunicar_baja.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/6_comunicar_baja.jpg',
    categoria: 'funcionalidades',
    orden: 7
  },
  {
    id: '7-inscripciones',
    titulo: 'Gestionar Inscripciones al Comedor',
    descripcion: 'Inscribe a tus hijos en el servicio de comedor escolar',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/7_inscripciones.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/7_inscripciones.jpg',
    categoria: 'funcionalidades',
    orden: 8
  },
  {
    id: '8-comida-puntual',
    titulo: 'Solicitar Comida Puntual',
    descripcion: 'Reserva el comedor para días específicos cuando sea necesario',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/8_comida_puntual.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/8_comida_puntual.jpg',
    categoria: 'funcionalidades',
    orden: 9
  },
  {
    id: '9-platos-combinados',
    titulo: 'Elegir Platos del Menú',
    descripcion: 'Selecciona las opciones de menú disponibles para tus hijos',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/9_platos_combinados.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/9_platos_combinados.jpg',
    categoria: 'funcionalidades',
    orden: 10
  },
  {
    id: '10-dieta-blanda',
    titulo: 'Solicitar Dieta Blanda',
    descripcion: 'Pide una dieta especial cuando tu hijo esté enfermo o en recuperación',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/10_dieta_blanda.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/10_dieta_blanda.jpg',
    categoria: 'funcionalidades',
    orden: 11
  },
  {
    id: '11-restricciones',
    titulo: 'Configurar Restricciones Dietéticas',
    descripcion: 'Informa sobre alergias, intolerancias o preferencias alimentarias',
    videoUrl: 'https://comedor.colegiolospinos.eu/recursos/11_restricciones.mp4',
    portadaUrl: 'https://comedor.colegiolospinos.eu/recursos/11_restricciones.jpg',
    categoria: 'funcionalidades',
    orden: 12
  }
];
