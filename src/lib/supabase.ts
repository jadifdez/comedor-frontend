import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Padre {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  activo: boolean;
  es_personal: boolean;
  created_at: string;
}

export interface Hijo {
  id: string;
  nombre: string;
  grado_id: string;
  padre_id: string;
  activo: boolean;
  created_at: string;
  grado?: Grado; // Para joins
}

export interface BajaComedor {
  id: string;
  hijo: string;
  hijo_id: string | null;
  padre_id?: string | null;
  curso: string;
  dias: string[];
  fecha_creacion: string;
  user_id: string;
  hijo_details?: Hijo; // Para joins
}

export interface Grado {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  tiene_opcion_menu: boolean;
}

export interface SolicitudComida {
  id: string;
  hijo: string;
  hijo_id: string | null;
  padre_id?: string | null;
  curso: string;
  fecha: string;
  fecha_creacion: string;
  user_id: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  hijo_details?: Hijo; // Para joins
}

export interface OpcionMenuPrincipal {
  id: string;
  dia_semana: number; // 1=Lunes, 2=Martes, etc.
  nombre: string;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface OpcionMenuGuarnicion {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface EleccionMenu {
  id: string;
  hijo_id: string;
  fecha: string; // YYYY-MM-DD
  opcion_principal_id: string;
  opcion_guarnicion_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Para joins
  hijo_details?: Hijo;
  opcion_principal?: OpcionMenuPrincipal;
  opcion_guarnicion?: OpcionMenuGuarnicion;
}

export interface Enfermedad {
  id: string;
  hijo_id: string;
  hijo: string;
  curso: string;
  fecha_dieta_blanda: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  user_id: string;
  fecha_creacion: string;
  updated_at: string;
  hijo_details?: Hijo; // Para joins
}

export interface InscripcionComedor {
  id: string;
  hijo_id: string;
  dias_semana: number[]; // Array con los días: 1=Lunes, 2=Martes, etc.
  precio_diario: number;
  descuento_aplicado: number; // Percentage discount applied (0-100)
  activo: boolean;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin?: string; // YYYY-MM-DD, nullable
  created_at: string;
  updated_at: string;
  hijo_details?: Hijo; // Para joins
}

export interface DiaFestivo {
  id: string;
  fecha: string; // YYYY-MM-DD
  nombre: string;
  activo: boolean;
  created_at: string;
}

export interface Administrador {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InscripcionComedorPadre {
  id: string;
  padre_id: string;
  dias_semana: number[];
  precio_diario: number;
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}