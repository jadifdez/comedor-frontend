// src/lib/mail.ts
import { supabase } from './supabase';

type SendPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
};

const API = import.meta.env.VITE_MAIL_API_URL;

export async function sendAppEmail(payload: SendPayload) {
  if (!API) throw new Error('Falta VITE_MAIL_API_URL');

  // 1) Recuperar access token del usuario logueado
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Usuario no autenticado');

  // 2) Llamar a tu backend de correo
  const res = await fetch(`${API}/api/mail/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || 'Error enviando email');
  }
  return json; // { ok: true, messageId }
}
