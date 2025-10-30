// src/components/AuthWrapper.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, AlertCircle, Mail, ArrowLeft, Shield, Lock, CheckCircle2 } from 'lucide-react';

interface AuthWrapperProps {
  children: (user: User) => React.ReactNode;
}

function traducirError(error: unknown): string {
  const msg = (typeof error === 'object' && error && 'message' in error)
    ? String((error as any).message || '')
    : String(error || '');
  const texto = msg.toLowerCase();

  if (texto.includes('invalid login credentials') || texto.includes('invalid_credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (texto.includes('user already registered') || texto.includes('email already registered')) {
    return 'Ya existe una cuenta con este email. Usa “Iniciar sesión”.';
  }
  if (texto.includes('email or phone') || texto.includes('missing email')) {
    return 'Debes introducir un email válido.';
  }
  if (texto.includes('rate limit') || texto.includes('too many requests')) {
    return 'Demasiados intentos. Inténtalo de nuevo en unos minutos.';
  }
  if ((texto.includes('invalid') || texto.includes('expired')) && texto.includes('token')) {
    return 'El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.';
  }
  if (texto.includes('permission denied') || texto.includes('rls')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (texto.includes('network') || texto.includes('fetch') || texto.includes('failed to fetch')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  return msg || 'Se ha producido un error inesperado. Inténtalo de nuevo.';
}

function isRecoveryInProgress(): boolean {
  try {
    const raw = localStorage.getItem('lp_recovery_in_progress');
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts?: number };
    if (obj?.ts && Date.now() - obj.ts > 15 * 60 * 1000) {
      localStorage.removeItem('lp_recovery_in_progress');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPadreAutorizado, setIsPadreAutorizado] = useState<boolean | null>(null);

  // Candado por recuperación
  const [recoveryLock, setRecoveryLock] = useState<boolean>(isRecoveryInProgress());

  // Modo “establecer nueva contraseña”
  const [showSetNewPassword, setShowSetNewPassword] = useState(false);
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [setPassLoading, setSetPassLoading] = useState(false);

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Mensajería
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Banner verde tras reset (debajo del logo)
  const [loginBanner, setLoginBanner] = useState<string>('');

  // Recuperación (solicitud)
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Registro
  const [showRegister, setShowRegister] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // 0) Opcional: soporta ?code= con intercambio explícito
  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const u = new URL(href);
        const code = u.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(href);
          u.searchParams.delete('code');
          window.history.replaceState({}, '', u.pathname + (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '') + u.hash);
        }
      } catch {
        // no-op
      }
    })();
  }, []);

  // 1) Detectar querys (recovery y prefill registro) — sin perder el hash
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const type = url.searchParams.get('type');
      const qEmail = url.searchParams.get('email') || '';

      if (type === 'recovery') {
        localStorage.setItem('lp_recovery_in_progress', JSON.stringify({ ts: Date.now(), email: qEmail || undefined }));
        setRecoveryLock(true);
        setShowSetNewPassword(true);

        // Limpiamos querys conservando hash
        url.searchParams.delete('type');
        if (qEmail) url.searchParams.delete('email');
        const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
        window.history.replaceState({}, '', cleaned);
      }

      // Prefill registro
      const reg = url.searchParams.get('register');
      if (reg === '1') {
        setShowRegister(true);
        const prefill = qEmail || localStorage.getItem('lp_prefill_register_email') || '';
        if (prefill) {
          setRegisterEmail(prefill);
          localStorage.removeItem('lp_prefill_register_email');
        }
        url.searchParams.delete('register');
        if (qEmail) url.searchParams.delete('email');
        const cleaned = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
        window.history.replaceState({}, '', cleaned);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // 1.1) Si venimos de un reset exitoso, mostrar banner y pre-rellenar email
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lp_recovery_success');
      if (!raw) return;
      const obj = JSON.parse(raw) as { email?: string; ts?: number };
      // 10 minutos de validez para el banner
      if (obj?.ts && Date.now() - obj.ts < 10 * 60 * 1000) {
        const em = (obj.email || '').trim();
        if (em) setEmail(em);
        setLoginBanner('Tu contraseña se ha creado correctamente. Inicia sesión con tu email.');
        // Enfocar el campo contraseña si tenemos email pre-rellenado
        setTimeout(() => passwordInputRef.current?.focus(), 50);
      }
    } catch {
      // no-op
    } finally {
      // Siempre limpiamos el flag
      localStorage.removeItem('lp_recovery_success');
    }
  }, []);

  // 2) Sincroniza el candado entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lp_recovery_in_progress') {
        const active = isRecoveryInProgress();
        setRecoveryLock(active);
        setShowSetNewPassword(active);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 3) Sesión inicial y cambios
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (isRecoveryInProgress()) {
          setRecoveryLock(true);
          setShowSetNewPassword(true);
          setLoading(false);
          return;
        }
        checkPadreAutorizado(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isRecoveryInProgress()) {
        setRecoveryLock(true);
        setShowSetNewPassword(true);
        setUser(session?.user ?? null);
        setIsPadreAutorizado(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        checkPadreAutorizado(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsPadreAutorizado(null);
        setLoading(false);
      } else if (session?.user) {
        checkPadreAutorizado(session.user);
      } else {
        setUser(null);
        setIsPadreAutorizado(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3.1) Cuando ya estamos mostrando "establecer nueva contraseña", limpiamos el hash tras un pelín
  useEffect(() => {
    if (!showSetNewPassword) return;
    const t = setTimeout(() => {
      const u = new URL(window.location.href);
      // limpiamos SOLO el hash, conservando search limpio
      window.history.replaceState({}, '', u.pathname + (u.search ? u.search : ''));
    }, 300);
    return () => clearTimeout(t);
  }, [showSetNewPassword]);

  const checkPadreAutorizado = async (usuario: User) => {
    try {
      const { data, error } = await supabase
        .from('padres')
        .select('*')
        .eq('email', usuario.email)
        .eq('activo', true)
        .maybeSingle();

      if (error || !data) {
        setIsPadreAutorizado(false);
        setUser(null);
      } else {
        setIsPadreAutorizado(true);
        setUser(usuario);
      }
    } catch {
      setIsPadreAutorizado(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ====== HANDLERS ======
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const emailTrim = email.trim();
      const { error } = await supabase.auth.signInWithPassword({ email: emailTrim, password });
      if (error) throw error;
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setError('');
    setInfoMessage('');

    const emailTrim = registerEmail.trim();
    if (registerPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setRegisterLoading(false);
      return;
    }
    if (registerPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setRegisterLoading(false);
      return;
    }

    try {
      const { data: padres, error: padreError } = await supabase
        .from('padres')
        .select('email')
        .eq('email', emailTrim)
        .eq('activo', true)
        .limit(1);

      if (padreError) {
        setError('Error al verificar el email en el sistema. Inténtalo de nuevo.');
        return;
      }
      if (!padres || padres.length === 0) {
        setError('Este email no está registrado en el sistema del colegio.');
        return;
      }

      const { error } = await supabase.auth.signUp({ email: emailTrim, password: registerPassword });
      if (error) throw error;

      setInfoMessage('Cuenta creada correctamente. Ya puedes iniciar sesión.');
      setShowRegister(false);
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setRegisterLoading(false);
    }
  };

  const API = import.meta.env.VITE_MAIL_API_URL as string;

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    setInfoMessage('');

    const emailTrim = resetEmail.trim();
    try {
      const { data: padres, error: padreError } = await supabase
        .from('padres')
        .select('email')
        .eq('email', emailTrim)
        .eq('activo', true)
        .limit(1);

      if (padreError) {
        setError('Error al verificar el email en el sistema. Inténtalo de nuevo.');
        return;
      }
      if (!padres || padres.length === 0) {
        setError('Este email no está registrado en el sistema del colegio.');
        return;
      }

      try { localStorage.setItem('lp_recovery_in_progress', JSON.stringify({ ts: Date.now(), email: emailTrim })); } catch {}

      if (!API) throw new Error('Falta VITE_MAIL_API_URL');

      const res = await fetch(`${API}/api/auth/recovery-email-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'No se pudo enviar el correo de recuperación.');
      }

      setInfoMessage('Te hemos enviado un enlace para recuperar tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetPassLoading(true);
    setError('');
    setInfoMessage('');

    try {
      if (newPass1.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (newPass1 !== newPass2) throw new Error('Las contraseñas no coinciden.');

      // ✅ Asegúrate de que tenemos sesión de recuperación
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error('No se pudo validar la sesión de recuperación. Abre el enlace nuevamente desde tu email.');
      }

      const { error } = await supabase.auth.updateUser({ password: newPass1 });
      if (error) throw error;

      // Capturamos el email para pre-rellenar más tarde
      let emailToPrefill = '';
      try {
        const rec = JSON.parse(localStorage.getItem('lp_recovery_in_progress') || '{}') as { email?: string };
        emailToPrefill = rec?.email || data.session?.user?.email || '';
      } catch {
        emailToPrefill = data.session?.user?.email || '';
      }

      // Marcamos éxito para mostrar banner verde y prefill email en login
      try {
        localStorage.setItem('lp_recovery_success', JSON.stringify({ email: emailToPrefill, ts: Date.now() }));
      } catch {}

      // Cerramos el flujo recovery
      try { localStorage.removeItem('lp_recovery_in_progress'); } catch {}
      setRecoveryLock(false);
      setShowSetNewPassword(false);
      setNewPass1('');
      setNewPass2('');

      // Por seguridad, cerrar sesión y volver al inicio (el banner se mostrará allí)
      await supabase.auth.signOut();
      window.location.replace('/');
    } catch (err) {
      setError(traducirError(err));
    } finally {
      setSetPassLoading(false);
    }
  };

  // ====== RENDER ======
  if (recoveryLock && !showSetNewPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recuperación de contraseña en curso</h2>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Hemos detectado un proceso de recuperación de contraseña. Para tu seguridad, el acceso permanecerá bloqueado hasta que completes el cambio.
          </p>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
            onClick={() => setShowSetNewPassword(true)}
          >
            Establecer nueva contraseña
          </button>
          <button
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg py-2 mt-2"
            onClick={async () => {
              try { localStorage.removeItem('lp_recovery_in_progress'); } catch {}
              await supabase.auth.signOut();
              window.location.replace('/');
            }}
          >
            Cancelar y cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (showSetNewPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <form onSubmit={handleSetNewPassword} className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Establecer nueva contraseña</h1>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800">{error}</p></div>}
          {infoMessage && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-sm text-green-800">{infoMessage}</p></div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPass1}
              onChange={e => setNewPass1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={newPass2}
              onChange={e => setNewPass2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              minLength={6}
              required
            />
          </div>

          <button
            disabled={setPassLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 disabled:opacity-50"
          >
            {setPassLoading ? 'Actualizando…' : 'Guardar contraseña'}
          </button>

          <button
            type="button"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg py-2"
            onClick={async () => {
              try { localStorage.removeItem('lp_recovery_in_progress'); } catch {}
              setShowSetNewPassword(false);
              await supabase.auth.signOut();
              window.location.replace('/');
            }}
          >
            Cancelar
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || isPadreAutorizado === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <img src="/horizontal_positivo.png" alt="Colegio Los Pinos" className="h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Comedor Colegio Los Pinos</h1>
            <p className="text-gray-600">Acceso para padres autorizados</p>

            {/* ✅ Banner verde debajo del logo */}
            {loginBanner && (
              <div className="mt-4 inline-flex items-start text-left w-full">
                <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{loginBanner}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isPadreAutorizado === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Acceso no autorizado</p>
                  <p className="text-sm text-red-700 mt-1">
                    Tu email no está registrado en el sistema del colegio. Contacta con la administración para obtener acceso.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== REGISTRO ===== */}
          {showRegister && (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setShowRegister(false); setError(''); setInfoMessage(''); setRegisterEmail(''); setRegisterPassword(''); setConfirmPassword(''); }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Volver al inicio de sesión"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Crear cuenta</h2>
              </div>

              <div>
                <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email registrado en el colegio</label>
                <input
                  id="registerEmail"
                  type="email"
                  inputMode="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tu.email@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 mb-1">Contraseña (mínimo 6 caracteres)</label>
                <input
                  id="registerPassword"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800">{error}</p></div>}
              {infoMessage && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-sm text-green-800">{infoMessage}</p></div>}

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {registerLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : (<><LogIn className="h-4 w-4" /><span>Crear cuenta</span></>)}
              </button>
            </form>
          )}

          {/* ===== RECUPERAR CONTRASEÑA (solicitud) ===== */}
          {showPasswordReset && !showRegister && (
            <form onSubmit={handlePasswordReset} className="space-y-4" noValidate>
              <div className="flex items-center space-x-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordReset(false); setError(''); setInfoMessage(''); setResetEmail(''); }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Volver al inicio de sesión"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h2>
              </div>

              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">Email registrado en el colegio</label>
                <input
                  id="resetEmail"
                  type="email"
                  inputMode="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tu.email@ejemplo.com"
                  required
                />
              </div>

              {infoMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Mail className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{infoMessage}</p>
                  </div>
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800">{error}</p></div>}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {resetLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : (<><Mail className="h-4 w-4" /><span>Enviar enlace de recuperación</span></>)}
              </button>
            </form>
          )}

          {/* ===== LOGIN ===== */}
          {!showRegister && !showPasswordReset && (
            <form onSubmit={handleAuth} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  id="password"
                  ref={passwordInputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800">{error}</p></div>}
              {infoMessage && <div className="bg-green-50 border border-green-200 rounded-lg p-3"><p className="text-sm text-green-800">{infoMessage}</p></div>}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {authLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : (<><LogIn className="h-4 w-4" /><span>Iniciar sesión</span></>)}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowPasswordReset(true); setError(''); setInfoMessage(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowRegister(true); setError(''); setInfoMessage(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ¿No tienes cuenta? Regístrate
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Solo los padres pre-registrados por el colegio pueden crear una cuenta.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a href="/admin.html" className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                <Shield className="h-4 w-4" />
                <span>Acceso para administradores</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AUTENTICADO + AUTORIZADO
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex justify-end">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 text-sm text-white hover:text-blue-100 transition-colors"
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
