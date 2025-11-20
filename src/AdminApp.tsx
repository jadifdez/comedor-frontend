import React, { useState, useEffect } from 'react';
import { AdminWrapper } from './components/AdminWrapper';
import { AdminHeader } from './components/AdminHeader';
import { OfflineBanner } from './components/OfflineBanner';
import { useOnlineStatus } from './hooks/useOnlineStatus';
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
import { CambiarPasswordAdmin } from './components/admin/CambiarPasswordAdmin';
import InscripcionesManager from './components/admin/InscripcionesManager';
import RLSLogsViewer from './components/admin/RLSLogsViewer';
import { User } from '@supabase/supabase-js';

type TabType = 'administradores' | 'padres' | 'personal' | 'hijos' | 'grados' | 'menu' | 'festivos' | 'facturacion' | 'configuracion' | 'invitaciones' | 'gestion-diaria' | 'restricciones' | 'inscripciones' | 'cambiar-password' | 'rls-logs';

function AdminContent({ user, activeTab, setActiveTab }: { user: User; activeTab: TabType; setActiveTab: (tab: TabType) => void }) {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    window.addEventListener('changeAdminTab', handleTabChange as EventListener);

    return () => {
      window.removeEventListener('changeAdminTab', handleTabChange as EventListener);
    };
  }, [setActiveTab]);

  return (
    <>
      <OfflineBanner isVisible={!isOnline} />
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
        {activeTab === 'rls-logs' && <RLSLogsViewer />}
        {activeTab === 'cambiar-password' && <CambiarPasswordAdmin />}
      </main>
    </>
  );
}

function AdminApp() {
  const [activeTab, setActiveTab] = useState<TabType>('gestion-diaria');

  return (
    <AdminWrapper onChangePasswordClick={() => setActiveTab('cambiar-password')}>
      {(user) => <AdminContent user={user} activeTab={activeTab} setActiveTab={setActiveTab} />}
    </AdminWrapper>
  );
}

export default AdminApp;