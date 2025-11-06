import React, { useState, useRef, useEffect } from 'react';
import { Users, GraduationCap, ChefHat, Calendar, Euro, Settings, Gift, ChevronDown, ClipboardList, AlertCircle, UserPlus } from 'lucide-react';

type TabType = 'administradores' | 'padres' | 'personal' | 'hijos' | 'grados' | 'menu' | 'festivos' | 'facturacion' | 'configuracion' | 'invitaciones' | 'gestion-diaria' | 'restricciones' | 'inscripciones' | 'cambiar-password';

interface AdminHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AdminHeader({ activeTab, onTabChange }: AdminHeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (tab: TabType, hasDropdown: boolean = false) => {
    if (!hasDropdown) {
      onTabChange(tab);
      setOpenDropdown(null);
    }
  };

  const handleDropdownToggle = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const handleSubItemClick = (tab: TabType) => {
    onTabChange(tab);
    setOpenDropdown(null);
  };

  const isPersonasActive = ['administradores', 'padres', 'personal', 'hijos'].includes(activeTab);
  const isConfiguracionActive = ['festivos', 'menu', 'configuracion', 'grados', 'restricciones'].includes(activeTab);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <img
              src="/horizontal_positivo.png"
              alt="Colegio Los Pinos"
              className="h-12"
            />
          </div>

          <nav className="flex items-center space-x-1" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('personas')}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isPersonasActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Personas</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'personas' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'personas' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => handleSubItemClick('hijos')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'hijos'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Alumnos
                  </button>
                  <button
                    onClick={() => handleSubItemClick('padres')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'padres'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Padres
                  </button>
                  <button
                    onClick={() => handleSubItemClick('personal')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'personal'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => handleSubItemClick('administradores')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'administradores'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Administradores
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => handleMenuClick('gestion-diaria')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'gestion-diaria'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Parte Diario</span>
            </button>

            <button
              onClick={() => handleMenuClick('inscripciones')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'inscripciones'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Inscripciones</span>
            </button>

            <button
              onClick={() => handleMenuClick('invitaciones')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'invitaciones'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Gift className="h-4 w-4" />
              <span>Invitaciones</span>
            </button>

            <button
              onClick={() => handleMenuClick('facturacion')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'facturacion'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Euro className="h-4 w-4" />
              <span>Facturación</span>
            </button>

            <div className="relative">
              <button
                onClick={() => handleDropdownToggle('configuracion')}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isConfiguracionActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === 'configuracion' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'configuracion' && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={() => handleSubItemClick('grados')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'grados'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cursos
                  </button>
                  <button
                    onClick={() => handleSubItemClick('menu')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'menu'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Menús
                  </button>
                  <button
                    onClick={() => handleSubItemClick('festivos')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'festivos'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Días Festivos
                  </button>
                  <button
                    onClick={() => handleSubItemClick('configuracion')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'configuracion'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Precios
                  </button>
                  <button
                    onClick={() => handleSubItemClick('restricciones')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      activeTab === 'restricciones'
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Restricciones Dietéticas
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
