import React, { useState, useEffect } from 'react';
import { supabase, Administrador } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { AuthError } from '@supabase/supabase-js';
import { LogIn, LogOut, AlertCircle, Shield } from 'lucide-react';

interface AdminWrapperProps {
  children: (user: User) => React.ReactNode;
}

export function AdminWrapper({ children }: AdminWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkAdminAccess(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAdminAccess(session.user);
      } else {
        setUser(null);
        setIsAdmin(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminAccess = async (user: User) => {
    try {
      // Check if user is admin by querying the administradores table
      const { data, error } = await supabase
        .from('administradores')
        .select('*')
        .eq('email', user.email)
        .eq('activo', true)
        .single();

      if (data && !error) {
        setIsAdmin(true);
        setUser(user);
      } else {
        setIsAdmin(false);
        setUser(null);
      }
    } catch (error) {
      setIsAdmin(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw error;
      }
    } catch (error: any) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos');
      } else {
        setError(error.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <img
              src="/horizontal_positivo.png"
              alt="Colegio Los Pinos"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">
              Acceso restringido para administradores
            </p>
          </div>

          {isAdmin === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Acceso de administrador</p>
                  <p className="text-sm text-red-700 mt-1">
                    Solo los usuarios registrados en la tabla de administradores pueden acceder a este panel.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Si necesitas acceso, contacta con un administrador existente para que te agregue al sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email de administrador
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@lospinos.edu"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error de autenticación</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    <p className="text-xs text-red-600 mt-2">
                      Verifica que tu email esté registrado como administrador y que la contraseña sea correcta.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className={`
                w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${authLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                }
              `}
            >
              {authLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Acceder al panel</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Solo administradores registrados en el sistema pueden acceder
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a
                href="/"
                className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Acceso para padres</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white">Panel de Administración</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 text-sm text-white hover:text-green-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
      {children(user)}
    </div>
  );
}