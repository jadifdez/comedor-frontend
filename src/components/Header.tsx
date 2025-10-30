import React from 'react';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <img
            src="/horizontal_positivo.png"
            alt="Colegio Los Pinos"
            className="h-16"
          />
        </div>
      </div>
    </header>
  );
}