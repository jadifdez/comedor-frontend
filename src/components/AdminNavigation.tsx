import React from 'react';
import { Users, GraduationCap, UserCheck, ChefHat, Calendar, Euro, Shield, Settings, Gift, Briefcase, ClipboardList, AlertCircle, UserPlus } from 'lucide-react';

interface AdminNavigationProps {
  activeTab: 'administradores' | 'padres' | 'personal' | 'hijos' | 'grados' | 'menu' | 'festivos' | 'facturacion' | 'configuracion' | 'invitaciones' | 'gestion-diaria' | 'restricciones' | 'inscripciones';
  onTabChange: (tab: 'administradores' | 'padres' | 'personal' | 'hijos' | 'grados' | 'menu' | 'festivos' | 'facturacion' | 'configuracion' | 'invitaciones' | 'gestion-diaria' | 'restricciones' | 'inscripciones') => void;
}

export function AdminNavigation({ activeTab, onTabChange }: AdminNavigationProps) {
  const getButtonClass = (tabId: string, isActive: boolean) => {
    const baseClass = 'flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-1 min-w-[100px]';

    if (!isActive) {
      return `${baseClass} text-gray-600 hover:text-gray-900 hover:bg-gray-50`;
    }

    const activeColors: Record<string, string> = {
      'gestion-diaria': 'bg-blue-600 text-white shadow-sm',
      'administradores': 'bg-slate-600 text-white shadow-sm',
      'padres': 'bg-cyan-600 text-white shadow-sm',
      'personal': 'bg-teal-600 text-white shadow-sm',
      'hijos': 'bg-green-600 text-white shadow-sm',
      'grados': 'bg-amber-600 text-white shadow-sm',
      'inscripciones': 'bg-purple-600 text-white shadow-sm',
      'menu': 'bg-orange-600 text-white shadow-sm',
      'festivos': 'bg-red-600 text-white shadow-sm',
      'invitaciones': 'bg-pink-600 text-white shadow-sm',
      'facturacion': 'bg-emerald-600 text-white shadow-sm',
      'restricciones': 'bg-rose-600 text-white shadow-sm',
      'configuracion': 'bg-gray-600 text-white shadow-sm',
    };

    return `${baseClass} ${activeColors[tabId] || 'bg-blue-600 text-white shadow-sm'}`;
  };

  const tabs = [
    { id: 'gestion-diaria' as const, label: 'Gestión Diaria', icon: ClipboardList },
    { id: 'inscripciones' as const, label: 'Inscripciones', icon: UserPlus },
    { id: 'invitaciones' as const, label: 'Invitaciones', icon: Gift },
    { id: 'administradores' as const, label: 'Administradores', icon: Shield },
    { id: 'padres' as const, label: 'Padres', icon: Users },
    { id: 'personal' as const, label: 'Personal', icon: Briefcase },
    { id: 'hijos' as const, label: 'Alumnos', icon: UserCheck },
    { id: 'grados' as const, label: 'Cursos', icon: GraduationCap },
    { id: 'menu' as const, label: 'Menús', icon: ChefHat },
    { id: 'festivos' as const, label: 'Días Festivos', icon: Calendar },
    { id: 'facturacion' as const, label: 'Facturación', icon: Euro },
    { id: 'restricciones' as const, label: 'Restricciones', icon: AlertCircle },
    { id: 'configuracion' as const, label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={getButtonClass(tab.id, isActive)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs text-center truncate w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}