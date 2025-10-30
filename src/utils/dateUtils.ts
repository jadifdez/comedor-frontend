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
    const fechaStr = currentDate.toISOString().split('T')[0];
    
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
        id: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
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