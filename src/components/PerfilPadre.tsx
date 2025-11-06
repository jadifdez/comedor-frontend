import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Save, AlertCircle, CheckCircle2, Mail, Phone, UserCircle, Info } from 'lucide-react';

interface PerfilPadreProps {
  user: User;
}

interface PadreData {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  es_personal: boolean;
}

export function PerfilPadre({ user }: PerfilPadreProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [padreData, setPadreData] = useState<PadreData | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    loadPadreData();
  }, [user.email]);

  const loadPadreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('padres')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('No se encontraron datos del padre');

      // Ensure user_id is set for this padre
      if (!data.user_id) {
        const { error: updateUserIdError } = await supabase
          .from('padres')
          .update({ user_id: user.id })
          .eq('id', data.id);

        if (!updateUserIdError) {
          // Update local data with the new user_id
          data.user_id = user.id;
        }
      }

      setPadreData(data);
      setNombre(data.nombre);
      setEmail(data.email);
      setTelefono(data.telefono || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!padreData) throw new Error('No hay datos del padre cargados');

      const nombreTrimmed = nombre.trim();
      const emailTrimmed = email.trim().toLowerCase();
      const telefonoTrimmed = telefono.trim();

      if (!nombreTrimmed) {
        throw new Error('El nombre no puede estar vacío');
      }

      if (!emailTrimmed) {
        throw new Error('El email no puede estar vacío');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        throw new Error('El formato del email no es válido');
      }

      const emailChanged = emailTrimmed !== padreData.email;

      // Si el email cambió, verificar que no exista otro padre con ese email
      if (emailChanged) {
        const { data: existingPadre, error: checkError } = await supabase
          .from('padres')
          .select('id')
          .eq('email', emailTrimmed)
          .neq('id', padreData.id)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingPadre) {
          throw new Error('Ya existe otro padre registrado con ese email');
        }
      }

      // Actualizar datos en la tabla padres PRIMERO
      console.log('Actualizando tabla padres...');
      const { error: updateError } = await supabase
        .from('padres')
        .update({
          nombre: nombreTrimmed,
          email: emailTrimmed,
          telefono: telefonoTrimmed || null
        })
        .eq('id', padreData.id);

      if (updateError) {
        console.error('Error al actualizar padres:', updateError);
        throw new Error(`No se pudo actualizar el perfil: ${updateError.message}`);
      }
      console.log('Tabla padres actualizada correctamente');

      // Si el email cambió, actualizar DESPUÉS en auth.users para que se envíe el email de confirmación
      if (emailChanged) {
        console.log('Email cambió, actualizando auth.users (se enviará email de confirmación)...');
        const { error: authError } = await supabase.auth.updateUser({
          email: emailTrimmed
        });

        if (authError) {
          console.error('Error al actualizar auth.users:', authError);
          // Revertir el cambio en padres
          await supabase
            .from('padres')
            .update({ email: padreData.email })
            .eq('id', padreData.id);
          throw new Error(`No se pudo actualizar el email: ${authError.message}`);
        }
        console.log('Auth.users actualizado, email de confirmación enviado');
      }

      if (emailChanged) {
        // Guardar información del cambio de email para mostrar banner en login
        try {
          localStorage.setItem('lp_email_change_pending', JSON.stringify({
            newEmail: emailTrimmed,
            oldEmail: padreData.email,
            ts: Date.now()
          }));
        } catch {}

        setSuccess('email_change_pending');

        // Esperar 5 segundos y cerrar sesión para que el usuario confirme el nuevo email
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = '/';
        }, 5000);
      } else {
        setSuccess('Perfil actualizado correctamente');
        console.log('Perfil actualizado, recargando datos...');
        await loadPadreData();
        console.log('Datos recargados');
      }
    } catch (err: any) {
      console.error('Error completo:', err);
      setError(err.message || 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!padreData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error al cargar los datos</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mi Perfil</h2>
            <p className="text-sm text-gray-600">Actualiza tus datos personales</p>
          </div>
        </div>

        {padreData.es_personal && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Cuenta de personal del colegio</span>
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && success === 'email_change_pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Confirmación de email requerida</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-medium">Hemos enviado un correo de confirmación a tu nuevo email.</p>
                  <p>Debes hacer clic en el enlace del correo antes de poder iniciar sesión con tu nueva dirección.</p>
                  <p className="text-xs mt-2 text-blue-700">Serás redirigido al inicio de sesión en unos segundos...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && success !== 'email_change_pending' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCircle className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre y apellidos"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="tu.email@ejemplo.com"
                required
              />
            </div>
            {email.toLowerCase() !== padreData.email && (
              <p className="mt-2 text-sm text-amber-600">
                Si cambias tu email, deberás verificar el nuevo correo y volver a iniciar sesión.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Número de teléfono (opcional)"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={loadPadreData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
