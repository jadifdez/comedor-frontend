import React from 'react';
import { Plus, CalendarX, ChefHat, Heart, Utensils, Euro, Gift, AlertCircle } from 'lucide-react';

interface NavigationProps {
  activeTab: 'inscripcion' | 'bajas' | 'solicitudes' | 'menu' | 'enfermedades' | 'facturacion' | 'invitaciones' | 'restricciones';
  onTabChange: (tab: 'inscripcion' | 'bajas' | 'solicitudes' | 'menu' | 'enfermedades' | 'facturacion' | 'invitaciones' | 'restricciones') => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-1">
        <button
          onClick={() => onTabChange('inscripcion')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'inscripcion'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Utensils className="h-5 w-5" />
          <span className="text-xs text-center">Inscripción comedor</span>
        </button>
        
        <button
          onClick={() => onTabChange('bajas')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'bajas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <CalendarX className="h-5 w-5" />
          <span className="text-xs text-center">Comunicar baja</span>
        </button>
        
        <button
          onClick={() => onTabChange('solicitudes')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'solicitudes'
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs text-center">Solicitar comida puntual</span>
        </button>
        
        <button
          onClick={() => onTabChange('menu')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'menu'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <ChefHat className="h-5 w-5" />
          <span className="text-xs text-center">Elegir menú</span>
        </button>
        
        <button
          onClick={() => onTabChange('enfermedades')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'enfermedades'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Heart className="h-5 w-5" />
          <span className="text-xs text-center">Solicitar dieta blanda</span>
        </button>
        
        <button
          onClick={() => onTabChange('facturacion')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'facturacion'
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Euro className="h-5 w-5" />
          <span className="text-xs text-center">Facturación</span>
        </button>

        <button
          onClick={() => onTabChange('invitaciones')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'invitaciones'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Gift className="h-5 w-5" />
          <span className="text-xs text-center">Invitaciones</span>
        </button>

        <button
          onClick={() => onTabChange('restricciones')}
          className={`
            flex flex-col items-center justify-center space-y-1 px-3 py-3 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'restricciones'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <AlertCircle className="h-5 w-5" />
          <span className="text-xs text-center">Restricciones</span>
        </button>
      </div>
    </div>
  );
}