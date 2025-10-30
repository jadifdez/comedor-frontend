# Configuración de Plantillas de Email en Supabase

Las plantillas de email de Supabase se pueden personalizar desde el Dashboard para que los correos sean más atractivos y profesionales.

## Acceso a las Plantillas

1. Ve al Dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. En el menú lateral, ve a: **Authentication** → **Email Templates**

## Plantillas Disponibles

### 1. Confirm signup (Confirmación de registro)
Usado cuando un usuario se registra por primera vez.

### 2. Invite user (Invitar usuario)
Usado cuando se invita a un usuario desde el admin.

### 3. Magic Link (Enlace mágico)
Usado para login sin contraseña.

### 4. Change Email Address ⭐ **IMPORTANTE**
**Esta es la plantilla que se usa cuando un usuario cambia su email en el perfil.**

### 5. Reset Password (Recuperar contraseña)
Usado cuando un usuario solicita recuperar su contraseña.

## Plantilla Personalizada para "Change Email Address"

Copia y pega esta plantilla en **Authentication → Email Templates → Change Email Address**:

### Subject:
```
Confirma tu nuevo email - Colegio Los Pinos
```

### HTML Template:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Colegio Los Pinos</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Comedor Escolar</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hola,</h2>

              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Has solicitado cambiar tu dirección de correo electrónico.
              </p>

              <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Nueva dirección de correo:</p>
                <p style="color: #1f2937; margin: 0; font-size: 18px; font-weight: 600;">{{ .Email }}</p>
              </div>

              <p style="color: #4b5563; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Por favor, confirma este cambio haciendo clic en el botón de abajo. Una vez confirmado, deberás iniciar sesión con tu nueva dirección de correo.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                      Confirmar cambio de email
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 20px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, ignora este correo y tu email actual permanecerá sin cambios.
                </p>
              </div>

              <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
                Este enlace expirará en 24 horas por motivos de seguridad.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                © 2025 Colegio Los Pinos. Todos los derechos reservados.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Este es un correo automático del sistema de comedor escolar.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Variables Disponibles

Supabase proporciona las siguientes variables en las plantillas:

- `{{ .Email }}` - El nuevo email del usuario
- `{{ .ConfirmationURL }}` - URL para confirmar el cambio
- `{{ .Token }}` - Token de confirmación
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL de tu sitio

## Otras Plantillas Recomendadas

### Reset Password (Recuperar Contraseña)

**Subject:**
```
Recupera tu contraseña - Colegio Los Pinos
```

**HTML Template:**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Colegio Los Pinos</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Comedor Escolar</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Recuperación de contraseña</h2>

              <p style="color: #4b5563; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Crear nueva contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 20px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, ignora este correo. Tu contraseña actual permanecerá sin cambios.
                </p>
              </div>

              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Este enlace expirará en 1 hora por motivos de seguridad.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                © 2025 Colegio Los Pinos. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Pasos para Aplicar

1. Ve a tu Dashboard de Supabase
2. Authentication → Email Templates
3. Selecciona "Change Email Address"
4. Copia el HTML de arriba
5. Actualiza el Subject
6. Guarda los cambios
7. Repite para "Reset Password" si lo deseas

## Notas Importantes

- Las plantillas usan HTML inline styles porque muchos clientes de email no soportan CSS externo
- El diseño es responsive y se ve bien en móviles
- Los colores azules (#2563eb) combinan con el tema de la aplicación
- Las plantillas incluyen avisos de seguridad importantes

## Vista Previa

Supabase permite enviar emails de prueba desde el Dashboard. Usa esta función para verificar cómo se ven las plantillas antes de aplicarlas en producción.
