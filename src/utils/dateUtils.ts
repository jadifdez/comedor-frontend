import { supabase } from '../lib/supabase';

// Cache para días festivos
let diasFestivosCache: string[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función para cargar días festivos desde la base de datos
const loadDiasFestivos = async (): Promise<string[]> => {
  const now = Date.now();
  
  // Si tenemos cache válido, lo usamos
  if (diasFestivosCache.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return diasFestivosCache;
  }

  try {
    const { data, error } = await supabase
      .from('dias_festivos')
      .select('fecha')
      .eq('activo', true);

    if (error) {
      console.error('Error loading días festivos:', error);
      return diasFestivosCache; // Devolver cache anterior si hay error
    }

    diasFestivosCache = data?.map(d => d.fecha) || [];
    lastFetchTime = now;
    return diasFestivosCache;
  } catch (error) {
    console.error('Error loading días festivos:', error);
    return diasFestivosCache; // Devolver cache anterior si hay error
  }
};

// Función para verificar si una fecha es día festivo
export const isDiaFestivo = async (fecha: Date): Promise<boolean> => {
  const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
  const diasFestivos = await loadDiasFestivos();
  return diasFestivos.includes(fechaStr);
};

export const getNext10WorkDays = async (diasAntelacion: number = 2) => {
  const workDays = [];
  const today = new Date();

  const diasFestivos = await loadDiasFestivos();

  let currentDate = new Date(today);
  currentDate.setDate(today.getDate() + diasAntelacion + 1);
  
  let addedDays = 0;
  
  while (addedDays < 10) {
    const dayOfWeek = currentDate.getDay(); // 0 = domingo, 6 = sábado
    const fechaStr = formatDateForComparison(currentDate);

    // Solo agregar días laborables (lunes a viernes) que no sean festivos
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !diasFestivos.includes(fechaStr)) {
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const dayName = dayNames[dayOfWeek];
      const dateStr = currentDate.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      
      workDays.push({
        id: fechaStr,
        label: `${dayName} ${currentDate.getDate()}`,
        nombre: `${dayName} ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]}`,
        fecha: dateStr,
        diaSemana: dayOfWeek,
        fullDate: new Date(currentDate)
      });
      
      addedDays++;
    }
    
    // Avanzar al siguiente día
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workDays;
};

// Función para limpiar el cache (útil cuando se actualizan los días festivos)
export const clearDiasFestivosCache = () => {
  diasFestivosCache = [];
  lastFetchTime = 0;
};

export const formatDateForDisplay = (date: Date) => {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = dayNames[date.getDay()];
  const dateStr = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return `${dayName} (${dateStr})`;
};

export const parseBajaDate = (dateStr: string): Date => {
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const formatDateForComparison = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMinCancellationDate = (diasAntelacion: number): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return addDays(today, diasAntelacion + 1);
};

export interface BajaFechaFields {
  dias?: string[];
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

/** Convierte YYYY-MM-DD a DD/MM/YYYY usando hora local (evita desfases UTC). */
export function formatFechaEspanolFromISO(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Indica si una baja cubre un día concreto (formato dias o fecha_inicio/fecha_fin). */
export function bajaCubreFecha(fecha: string, baja: BajaFechaFields): boolean {
  if (baja.dias && baja.dias.length > 0) {
    const fechaFormateada = formatFechaEspanolFromISO(fecha);
    if (baja.dias.includes(fechaFormateada)) {
      return true;
    }
  }
  if (baja.fecha_inicio && baja.fecha_fin) {
    return fecha >= baja.fecha_inicio && fecha <= baja.fecha_fin;
  }
  return false;
}

/** Indica si una baja solapa con un rango de fechas ISO. */
export function bajaSolapaRango(
  baja: BajaFechaFields,
  rangoInicio: string,
  rangoFin: string
): boolean {
  if (baja.fecha_inicio && baja.fecha_fin) {
    return baja.fecha_inicio <= rangoFin && baja.fecha_fin >= rangoInicio;
  }
  if (baja.dias && baja.dias.length > 0) {
    return baja.dias.some((diaStr) => {
      const iso = formatDateForComparison(parseBajaDate(diaStr));
      return iso >= rangoInicio && iso <= rangoFin;
    });
  }
  return false;
}

/** Devuelve las fechas ISO (YYYY-MM-DD) de una baja dentro de un rango. */
export function getFechasISODeBaja(
  baja: BajaFechaFields,
  rangoInicio: string,
  rangoFin: string
): string[] {
  const fechas: string[] = [];

  if (baja.fecha_inicio && baja.fecha_fin) {
    const inicio = baja.fecha_inicio > rangoInicio ? baja.fecha_inicio : rangoInicio;
    const fin = baja.fecha_fin < rangoFin ? baja.fecha_fin : rangoFin;
    if (inicio > fin) return fechas;

    const current = new Date(inicio + 'T00:00:00');
    const end = new Date(fin + 'T00:00:00');
    while (current <= end) {
      fechas.push(formatDateForComparison(current));
      current.setDate(current.getDate() + 1);
    }
    return fechas;
  }

  if (baja.dias && baja.dias.length > 0) {
    for (const diaStr of baja.dias) {
      const iso = formatDateForComparison(parseBajaDate(diaStr));
      if (iso >= rangoInicio && iso <= rangoFin) {
        fechas.push(iso);
      }
    }
  }

  return fechas;
}

/** Añade al set todas las fechas ISO de una baja dentro del rango. */
export function addBajaFechasToSet(
  baja: BajaFechaFields,
  rangoInicio: string,
  rangoFin: string,
  set: Set<string>
): void {
  for (const fecha of getFechasISODeBaja(baja, rangoInicio, rangoFin)) {
    set.add(fecha);
  }
}