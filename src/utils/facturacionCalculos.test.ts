import { describe, it, expect } from 'vitest';
import { tieneBaja } from './facturacionCalculos';
import { bajaCubreFecha } from './dateUtils';
import type { BajaComedor } from '../lib/supabase';

const bajaSoloDias = (dias: string[]): BajaComedor => ({
  id: '1',
  hijo: 'Test',
  hijo_id: 'hijo-1',
  curso: '1º',
  dias,
  fecha_creacion: '2025-01-01',
  user_id: 'user-1',
});

const bajaSoloRango = (inicio: string, fin: string): BajaComedor => ({
  id: '2',
  hijo: 'Test',
  hijo_id: 'hijo-1',
  curso: '1º',
  dias: [],
  fecha_inicio: inicio,
  fecha_fin: fin,
  fecha_creacion: '2025-01-01',
  user_id: 'user-1',
});

describe('bajaCubreFecha', () => {
  it('detecta baja en array dias (formato DD/MM/YYYY)', () => {
    expect(bajaCubreFecha('2025-10-15', bajaSoloDias(['15/10/2025']))).toBe(true);
    expect(bajaCubreFecha('2025-10-16', bajaSoloDias(['15/10/2025']))).toBe(false);
  });

  it('detecta baja en fecha_inicio/fecha_fin', () => {
    expect(bajaCubreFecha('2025-10-15', bajaSoloRango('2025-10-15', '2025-10-15'))).toBe(true);
    expect(bajaCubreFecha('2025-10-16', bajaSoloRango('2025-10-15', '2025-10-15'))).toBe(false);
  });

  it('detecta baja migrada con dias vacío y solo rango ISO', () => {
    const bajaMigrada = bajaSoloRango('2025-03-10', '2025-03-10');
    expect(bajaCubreFecha('2025-03-10', bajaMigrada)).toBe(true);
    expect(bajaCubreFecha('2025-03-11', bajaMigrada)).toBe(false);
  });

  it('detecta baja con ambos formatos (admin)', () => {
    const baja = {
      ...bajaSoloDias(['20/11/2025']),
      fecha_inicio: '2025-11-20',
      fecha_fin: '2025-11-20',
    };
    expect(bajaCubreFecha('2025-11-20', baja)).toBe(true);
  });
});

describe('tieneBaja', () => {
  it('devuelve true si alguna baja cubre la fecha', () => {
    const bajas = [
      bajaSoloDias(['01/10/2025']),
      bajaSoloRango('2025-10-15', '2025-10-15'),
    ];
    expect(tieneBaja('2025-10-01', bajas)).toBe(true);
    expect(tieneBaja('2025-10-15', bajas)).toBe(true);
    expect(tieneBaja('2025-10-20', bajas)).toBe(false);
  });
});
