import React, { useState } from 'react';
import { FileText, Wheat, Milk, Egg, Ban, Fish, UtensilsCrossed, ExternalLink, ChevronDown, ChevronUp, Moon } from 'lucide-react';

interface MenuCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  urlAnterior: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function MenusDashboard() {
  const [showPreviousMonth, setShowPreviousMonth] = useState(false);
  const menus: MenuCard[] = [
    {
      title: 'Menú Basal',
      description: 'Menú estándar del comedor escolar',
      icon: <UtensilsCrossed className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_basal_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_basal_anterior.pdf',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Platos Combinados',
      description: 'Opciones de menú combinado',
      icon: <FileText className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_platoscombinados_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_platoscombinados_anterior.pdf',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Sin Gluten',
      description: 'Menú adaptado para celíacos',
      icon: <Wheat className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_singluten_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_singluten_anterior.pdf',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Sin Lactosa',
      description: 'Menú libre de lácteos',
      icon: <Milk className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_sinlactosa_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_sinlactosa_anterior.pdf',
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200'
    },
    {
      title: 'Sin Huevo',
      description: 'Menú sin contenido de huevo',
      icon: <Egg className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_sinhuevo_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_sinhuevo_anterior.pdf',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Sin Cerdo',
      description: 'Menú sin carne de cerdo',
      icon: <Ban className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_sincerdo_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_sincerdo_anterior.pdf',
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200'
    },
    {
      title: 'Sin Pescado',
      description: 'Menú sin pescado ni marisco',
      icon: <Fish className="h-8 w-8" />,
      url: 'https://colegiolospinos.eu/menus/menu_sinpescado_actual.pdf',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_sinpescado_anterior.pdf',
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    {
      title: 'Menú Cenas',
      description: 'Menú de cenas escolares',
      icon: <Moon className="h-8 w-8" />,
      url: '',
      urlAnterior: 'https://colegiolospinos.eu/menus/menu_cenas_anterior.pdf',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Menús del Comedor</h1>
        <p className="text-blue-100 text-lg">
          Consulta los menús mensuales del comedor escolar. Encuentra el menú que mejor se adapte a las necesidades de tu hijo/a.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.filter(m => m.url).map((menu) => (
          <a
            key={menu.title}
            href={menu.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              ${menu.bgColor} ${menu.borderColor} border-2 rounded-xl p-6
              transform transition-all duration-200 hover:scale-105 hover:shadow-lg
              cursor-pointer group
            `}
          >
            <div className="flex flex-col h-full">
              <div className={`${menu.color} mb-4`}>
                {menu.icon}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                {menu.title}
              </h3>

              <p className="text-gray-600 text-sm mb-4 flex-grow">
                {menu.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className={`text-sm font-medium ${menu.color}`}>
                  Ver menú
                </span>
                <ExternalLink className={`h-4 w-4 ${menu.color} group-hover:translate-x-1 transition-transform`} />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPreviousMonth(!showPreviousMonth)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2 text-gray-600">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Menús del mes anterior</span>
          </div>
          {showPreviousMonth ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showPreviousMonth && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {menus.map((menu) => (
                <a
                  key={`anterior-${menu.title}`}
                  href={menu.urlAnterior}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${menu.color}`}>
                      {React.cloneElement(menu.icon as React.ReactElement, { className: 'h-5 w-5' })}
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {menu.title}
                    </span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <FileText className="h-6 w-6 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Información importante</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Los menús se actualizan mensualmente</li>
              <li>• Todos los menús cumplen con los requisitos nutricionales establecidos</li>
              <li>• Si tu hijo/a tiene restricciones dietéticas, consulta el menú correspondiente</li>
              <li>• Para dudas o consultas, contacta con el comedor escolar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
