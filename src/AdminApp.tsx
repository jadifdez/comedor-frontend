import React, { useState, useEffect } from 'react';
import { AdminWrapper } from './components/AdminWrapper';
import { AdminHeader } from './components/AdminHeader';
import { AdministradoresManager } from './components/admin/AdministradoresManager';
import { PadresManager } from './components/admin/PadresManager';
import { PersonalManager } from './components/admin/PersonalManager';
import { HijosManager } from './components/admin/HijosManager';
import { GradosManager } from './components/admin/GradosManager';
import { MenuManager } from './components/admin/MenuManager';
import { DiasFestivosManager } from './components/admin/DiasFestivosManager';
import { FacturacionAdminManager } from './components/admin/FacturacionAdminManager';
import { ConfiguracionPreciosManager } from './components/admin/ConfiguracionPreciosManager';
import { InvitacionesManager } from './components/admin/InvitacionesManager';
import { DailyManagementView } from './components/admin/DailyManagementView';
import { RestriccionesDieteticasManager } from './components/admin/RestriccionesDieteticasManager';
import InscripcionesManager from './components/admin/InscripcionesManager';
import { User } from '@supabase/supabase-js';

function AdminContent({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'administradores' | 'padres' | 'personal' | 'hijos' | 'grados' | 'menu' | 'festivos' | 'facturacion' | 'configuracion' | 'invitaciones' | 'gestion-diaria' | 'restricciones' | 'inscripciones'>('gestion-diaria');

  useEffect(() => {
    // Escuchar eventos para cambiar de pestaña
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('changeAdminTab', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('changeAdminTab', handleTabChange as EventListener);
    };
  }, []);

  return (
    <>
      <AdminHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'gestion-diaria' && <DailyManagementView />}
        {activeTab === 'administradores' && <AdministradoresManager />}
        {activeTab === 'padres' && <PadresManager />}
        {activeTab === 'personal' && <PersonalManager />}
        {activeTab === 'hijos' && <HijosManager />}
        {activeTab === 'facturacion' && <FacturacionAdminManager />}
        {activeTab === 'grados' && <GradosManager />}
        {activeTab === 'inscripciones' && <InscripcionesManager />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'festivos' && <DiasFestivosManager />}
        {activeTab === 'configuracion' && <ConfiguracionPreciosManager />}
        {activeTab === 'invitaciones' && <InvitacionesManager />}
        {activeTab === 'restricciones' && <RestriccionesDieteticasManager />}
      </main>
    </>
  );
}

function AdminApp() {
  return (
    <AdminWrapper>
      {(user) => <AdminContent user={user} />}
    </AdminWrapper>
  );
}

export default AdminApp;