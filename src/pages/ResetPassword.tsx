// src/pages/ResetPassword.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function traducirError(error: unknown): string {
  const msg = (typeof error === 'object' && error && 'message' in error)
    ? String((error as any).message || '')
    : String(error || '');
  const texto = msg.toLowerCase();

  if ((texto.includes('invalid') || texto.includes('expired')) && texto.includes('token')) {
    return 'El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.';
  }
  if (texto.includes('rate limit') || texto.includes('too many requests')) {
    return 'Demasiados intentos. Inténtalo de nuevo en unos minutos.';
  }
  if (texto.includes('network') || texto.includes('fetch') || texto.includes('failed to fetch')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
  return msg || 'Se ha producido un error inesperado. Inténtalo de nuevo.';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const setGlobalRecoveryFlag = () => {
    try {
      localStorage.setItem('lp_recovery_in_progress', JSON.stringify({ ts: Date.now() }));
    } catch {}
  };
  const clearGlobalRecoveryFlag = () => {
    try {
      localStorage.removeItem('lp_recovery_in_progress');
    } catch {}
  };

  useEffect(() => {
    setGlobalRecoveryFlag();

    // ⚠️ No limpiar el hash aquí. Deja que el SDK lo procese.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
        setIsRecovering(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setIsRecovering(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== password2) return setError('Las contraseñas no coinciden.');

    // ✅ Verifica sesión de recuperación
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setError('No se pudo validar la sesión de recuperación. Abre el enlace nuevamente desde tu email.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(traducirError(error));
    } else {
      setMsg('Contraseña actualizada correctamente. Entrando…');
      clearGlobalRecoveryFlag();
      setTimeout(() => navigate('/'), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Establecer nueva contraseña</h1>
        {!isRecovering && (
          <p className="text-sm text-gray-600">
            Verificando enlace de recuperación…
          </p>
        )}

        <form onSubmit={handleSetPassword} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Repite la contraseña</label>
            <input
              type="password"
              value={password2}
              onChange={(e)=>setPassword2(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
          {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{msg}</p>}

          <button
            type="submit"
            disabled={loading || !isRecovering}
            className="w-full bg-blue-600 hover:bg-blue-700 text:white text-white rounded-lg py-2 disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar contraseña y entrar'}
          </button>
        </form>

        <div className="text-center">
          <button
            className="text-sm text-gray-600 hover:text-gray-800 underline"
            onClick={async () => {
              clearGlobalRecoveryFlag();
              await supabase.auth.signOut();
              navigate('/');
            }}
          >
            Cancelar y volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
