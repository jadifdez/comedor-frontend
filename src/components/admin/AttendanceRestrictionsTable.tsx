import React from 'react';
import { DailyDiner, RestriccionDietetica } from '../../hooks/useDailyManagement';
import { AlertCircle } from 'lucide-react';

interface AttendanceData {
  grupo: string;
  tipo: 'curso' | 'personal' | 'externo';
  restricciones: Map<string, number>;
  total: number;
}

interface AttendanceRestrictionsTableProps {
  comensales: DailyDiner[];
  restriccionesActivas: RestriccionDietetica[];
}

export function AttendanceRestrictionsTable({ comensales, restriccionesActivas }: AttendanceRestrictionsTableProps) {
  const comensalesActivos = comensales.filter(c => !c.cancelado_ultimo_momento);

  const restriccionesEncontradas = new Set<string>();
  comensalesActivos.forEach(comensal => {
    comensal.restricciones.forEach(restriccion => {
      restriccionesEncontradas.add(restriccion);
    });
  });

  const restriccionesDelDia = restriccionesActivas.filter(r =>
    restriccionesEncontradas.has(r.nombre)
  );

  if (restriccionesDelDia.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <span className="text-blue-800 font-medium">
            No hay comensales con restricciones dietéticas para este día
          </span>
        </div>
      </div>
    );
  }

  const gruposPorCurso = new Map<string, AttendanceData>();
  const grupoPersonal: AttendanceData = {
    grupo: 'Personal',
    tipo: 'personal',
    restricciones: new Map(),
    total: 0
  };
  const grupoExternos: AttendanceData = {
    grupo: 'Externos',
    tipo: 'externo',
    restricciones: new Map(),
    total: 0
  };

  restriccionesDelDia.forEach(r => {
    grupoPersonal.restricciones.set(r.nombre, 0);
    grupoExternos.restricciones.set(r.nombre, 0);
  });

  comensalesActivos.forEach(comensal => {
    if (comensal.restricciones.length === 0) return;

    if (comensal.tipo === 'padre') {
      grupoPersonal.total++;
      comensal.restricciones.forEach(restriccion => {
        if (restriccionesEncontradas.has(restriccion)) {
          const current = grupoPersonal.restricciones.get(restriccion) || 0;
          grupoPersonal.restricciones.set(restriccion, current + 1);
        }
      });
    } else if (comensal.tipo === 'externo') {
      grupoExternos.total++;
      comensal.restricciones.forEach(restriccion => {
        if (restriccionesEncontradas.has(restriccion)) {
          const current = grupoExternos.restricciones.get(restriccion) || 0;
          grupoExternos.restricciones.set(restriccion, current + 1);
        }
      });
    } else {
      const curso = comensal.curso || 'Sin curso';

      if (!gruposPorCurso.has(curso)) {
        const restriccionesMap = new Map<string, number>();
        restriccionesDelDia.forEach(r => restriccionesMap.set(r.nombre, 0));

        gruposPorCurso.set(curso, {
          grupo: curso,
          tipo: 'curso',
          restricciones: restriccionesMap,
          total: 0
        });
      }

      const grupo = gruposPorCurso.get(curso)!;
      grupo.total++;

      comensal.restricciones.forEach(restriccion => {
        if (restriccionesEncontradas.has(restriccion)) {
          const current = grupo.restricciones.get(restriccion) || 0;
          grupo.restricciones.set(restriccion, current + 1);
        }
      });
    }
  });

  const cursosOrdenados = Array.from(gruposPorCurso.values())
    .sort((a, b) => a.grupo.localeCompare(b.grupo));

  const todosLosGrupos: AttendanceData[] = [...cursosOrdenados];
  if (grupoPersonal.total > 0) {
    todosLosGrupos.push(grupoPersonal);
  }
  if (grupoExternos.total > 0) {
    todosLosGrupos.push(grupoExternos);
  }

  const totalesPorRestriccion = new Map<string, number>();
  restriccionesDelDia.forEach(r => totalesPorRestriccion.set(r.nombre, 0));

  todosLosGrupos.forEach(grupo => {
    grupo.restricciones.forEach((count, restriccion) => {
      const currentTotal = totalesPorRestriccion.get(restriccion) || 0;
      totalesPorRestriccion.set(restriccion, currentTotal + count);
    });
  });

  const totalGeneral = todosLosGrupos.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r border-gray-300">
              Curso
            </th>
            {restriccionesDelDia.map(restriccion => (
              <th
                key={restriccion.id}
                className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-300"
              >
                {restriccion.nombre}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-200">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {todosLosGrupos.map((grupo, index) => (
            <tr
              key={grupo.grupo}
              className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-300">
                {grupo.grupo}
              </td>
              {restriccionesDelDia.map(restriccion => {
                const count = grupo.restricciones.get(restriccion.nombre) || 0;
                return (
                  <td
                    key={restriccion.id}
                    className={`px-4 py-3 text-center text-sm border-r border-gray-300 ${
                      count > 0 ? 'font-semibold text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {count > 0 ? count : '-'}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 bg-gray-100">
                {grupo.total}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold">
            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
              TOTAL
            </td>
            {restriccionesDelDia.map(restriccion => {
              const total = totalesPorRestriccion.get(restriccion.nombre) || 0;
              return (
                <td
                  key={restriccion.id}
                  className={`px-4 py-3 text-center text-sm border-r border-gray-300 ${
                    total > 0 ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {total > 0 ? total : '-'}
                </td>
              );
            })}
            <td className="px-4 py-3 text-center text-sm text-gray-900 bg-gray-300">
              {totalGeneral}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
