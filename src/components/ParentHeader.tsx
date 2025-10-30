import React, { useState, useRef, useEffect } from 'react';
import { Utensils, CalendarX, Plus, ChefHat, Heart, Euro, Menu, X, AlertCircle } from 'lucide-react';

type TabType = 'inscripcion' | 'bajas' | 'solicitudes' | 'menu' | 'enfermedades' | 'facturacion' | 'restricciones';

interface ParentHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ParentHeader({ activeTab, onTabChange }: ParentHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = (tab: TabType) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const getMenuItemClass = (tab: TabType) => {
    return `flex items-center space-x-3 px-4 py-3 transition-colors ${
      activeTab === tab
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-700 hover:bg-gray-50'
    }`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <img
              src="/horizontal_positivo.png"
              alt="Colegio Los Pinos"
              className="h-12"
            />
          </div>

          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={toggleMenu}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Menú"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {isMenuOpen && (
              <div ref={menuRef} className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Comedor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('inscripcion')}
                  className={getMenuItemClass('inscripcion')}
                >
                  <Utensils className="h-5 w-5" />
                  <span className="text-sm">Inscripción comedor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('bajas')}
                  className={getMenuItemClass('bajas')}
                >
                  <CalendarX className="h-5 w-5" />
                  <span className="text-sm">Comunicar baja</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('solicitudes')}
                  className={getMenuItemClass('solicitudes')}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Solicitar comida puntual</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('menu')}
                  className={getMenuItemClass('menu')}
                >
                  <ChefHat className="h-5 w-5" />
                  <span className="text-sm">Elegir menú</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('enfermedades')}
                  className={getMenuItemClass('enfermedades')}
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">Solicitar dieta blanda</span>
                </button>

                <div className="px-4 py-2 border-b border-t border-gray-200 mt-2">
                  <h3 className="text-sm font-semibold text-gray-900">Servicios</h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('facturacion')}
                  className={getMenuItemClass('facturacion')}
                >
                  <Euro className="h-5 w-5" />
                  <span className="text-sm">Facturación</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMenuItemClick('restricciones')}
                  className={getMenuItemClass('restricciones')}
                >
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">Restricciones dietéticas</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
