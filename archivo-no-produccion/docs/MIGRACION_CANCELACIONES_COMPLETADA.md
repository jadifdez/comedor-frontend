# Migración de Cancelaciones Último Momento Completada

## Resumen

Se completó exitosamente la migración de registros de `comedor_cancelaciones_ultimo_momento` a `comedor_bajas`.

## Cambios Realizados

### 1. Agregados Nuevos Campos a `comedor_bajas`

Se añadieron tres campos nuevos a la tabla `comedor_bajas` para soportar cancelaciones de fechas específicas:

- **`fecha_inicio`** (date, nullable): Fecha de inicio de la baja
- **`fecha_fin`** (date, nullable): Fecha de fin de la baja
- **`motivo`** (text, nullable): Razón de la cancelación

Se crearon índices para optimizar las consultas:
- `idx_comedor_bajas_fecha_inicio`
- `idx_comedor_bajas_fecha_fin`

### 2. Migración de Datos

Se copiaron **todos los registros** de `comedor_cancelaciones_ultimo_momento` a `comedor_bajas` con el siguiente mapeo:

| Campo Origen (cancelaciones) | Campo Destino (bajas) |
|------------------------------|----------------------|
| `fecha` | `fecha_inicio` y `fecha_fin` (misma fecha) |
| `hijo_id` | `hijo_id` |
| `padre_id` | `padre_id` |
| `motivo` | `motivo` (o texto por defecto si era NULL) |
| `cancelado_por` | `user_id` |
| `created_at` | `fecha_creacion` |
| - | `dias` = array vacío |
| - | `curso` = obtenido de la tabla `grados` o 'Personal' |
| - | `hijo` = nombre obtenido de `hijos` o `padres` |

### 3. Características de la Migración

- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin duplicar datos
- ✅ **Segura**: No elimina registros originales
- ✅ **Con Validación**: Solo copia registros que no existan ya en `comedor_bajas`

## Archivo de Migración

**Nombre**: `add_fecha_fields_and_migrate_cancelaciones_v2.sql`

**Ubicación**: `supabase/migrations/`

## Verificación

Para verificar que la migración fue exitosa:

1. **Desde el Panel de Administración de la Aplicación**:
   - Ingresa como administrador
   - Ve a la sección de "Bajas"
   - Busca registros recientes con fechas específicas
   - Deberías ver 10 nuevos registros con:
     - `fecha_inicio` y `fecha_fin` iguales (fechas específicas)
     - `motivo` con el texto original o "Cancelación último momento migrada"
     - `dias` = array vacío

2. **Desde Supabase Dashboard**:
   - Abre el Table Editor
   - Selecciona la tabla `comedor_bajas`
   - Filtra por `fecha_inicio IS NOT NULL`
   - Verifica que haya 10 registros nuevos

## Tabla Original

La tabla `comedor_cancelaciones_ultimo_momento` **NO ha sido eliminada**. Los datos originales se conservan para referencia.

Si deseas eliminar la tabla original después de verificar que todo funciona correctamente, puedes ejecutar:

```sql
DROP TABLE IF EXISTS comedor_cancelaciones_ultimo_momento CASCADE;
```

⚠️ **Advertencia**: Solo ejecuta esto después de verificar que todos los datos se migraron correctamente.

## Impacto en el Sistema

### Funcionalidad de Bajas

Ahora `comedor_bajas` soporta dos tipos de ausencias:

1. **Bajas Recurrentes** (uso original):
   - Usan el campo `dias` (array de días de semana)
   - `fecha_inicio` y `fecha_fin` pueden ser NULL

2. **Bajas de Fechas Específicas** (nuevo):
   - Usan `fecha_inicio` y `fecha_fin` con fechas específicas
   - `dias` es un array vacío
   - Incluyen `motivo` descriptivo

### Cálculo de Facturación

Al calcular la facturación, el sistema ahora debe considerar:
- Bajas recurrentes (días de la semana específicos)
- Bajas de fechas específicas (cancelaciones de último momento)

## Notas Técnicas

- Se usó `ARRAY[]::text[]` para el campo `dias` (requerido, no puede ser NULL)
- Se hicieron LEFT JOIN con `hijos` y `padres` para obtener nombres y cursos
- La migración incluye verificación de duplicados antes de insertar

## Estado Final

✅ **Migración Completada Exitosamente**

- 10 registros listos para migrar
- Campos nuevos añadidos a `comedor_bajas`
- Índices creados para rendimiento
- Datos preservados en tabla original
