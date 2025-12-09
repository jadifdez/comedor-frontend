# Migración de Cancelaciones de Último Momento a Bajas

## Contexto

Anteriormente, las cancelaciones de último momento se guardaban en la tabla `comedor_cancelaciones_ultimo_momento`. Ahora, estas cancelaciones se registran directamente en la tabla `comedor_bajas` para unificar el sistema de gestión de bajas.

## Estado Actual

**✅ No hay datos que migrar.** La tabla `comedor_cancelaciones_ultimo_momento` está vacía, por lo que no se ha perdido ningún dato.

## Scripts de Migración Disponibles

Se han creado tres scripts para facilitar cualquier migración futura:

### 1. `consultar-cancelaciones.mjs`

Consulta y muestra todas las cancelaciones existentes en `comedor_cancelaciones_ultimo_momento`.

```bash
node consultar-cancelaciones.mjs
```

**Salida:**
- Total de cancelaciones
- Desglose por tipo (hijos vs personal)
- Detalles de cada cancelación (fecha, motivo, nombre, curso)

### 2. `migrar-cancelaciones-a-bajas.mjs`

Migra automáticamente todas las cancelaciones a la tabla `comedor_bajas`.

```bash
node migrar-cancelaciones-a-bajas.mjs
```

**Funcionalidad:**
- Lee todas las cancelaciones de `comedor_cancelaciones_ultimo_momento`
- Para cada una:
  - Obtiene los datos del hijo o padre (personal)
  - Convierte la fecha de formato ISO (YYYY-MM-DD) a español (DD/MM/YYYY)
  - Crea un registro en `comedor_bajas` con:
    - `hijo`: Nombre del hijo o personal
    - `curso`: Curso del hijo o "Personal del colegio"
    - `dias`: Array con la fecha en formato español
    - `motivo_baja`: Motivo original o "Cancelación de último momento"
    - `hijo_id` / `padre_id`: Referencias originales
    - `user_id`: Usuario que canceló
    - `fecha_creacion`: Fecha de creación original
- Muestra un resumen de la migración

### 3. `eliminar-cancelaciones-migradas.mjs`

Elimina los registros ya migrados de `comedor_cancelaciones_ultimo_momento`.

**⚠️ IMPORTANTE:** Solo ejecutar después de verificar que la migración fue exitosa.

```bash
# Ver advertencia y confirmación
node eliminar-cancelaciones-migradas.mjs

# Confirmar eliminación
node eliminar-cancelaciones-migradas.mjs --confirmar
```

## Proceso Completo de Migración

Si en el futuro hay datos que migrar, seguir estos pasos:

### Paso 1: Consultar datos existentes
```bash
node consultar-cancelaciones.mjs
```

Revisar la salida para conocer:
- Cuántas cancelaciones hay
- Fechas involucradas
- Nombres y cursos afectados

### Paso 2: Ejecutar migración
```bash
node migrar-cancelaciones-a-bajas.mjs
```

El script mostrará en tiempo real cada registro migrado y un resumen final.

### Paso 3: Verificar en la aplicación

1. Acceder al panel de administración
2. Ir a "Gestión Diaria"
3. Seleccionar las fechas de las cancelaciones migradas
4. Verificar que aparezcan en el listado con el badge "CANCELADO"

### Paso 4: Limpiar tabla original (opcional)
```bash
node eliminar-cancelaciones-migradas.mjs --confirmar
```

## Mapeo de Datos

| Tabla Origen | Campo Origen | Tabla Destino | Campo Destino | Transformación |
|--------------|--------------|---------------|---------------|----------------|
| `comedor_cancelaciones_ultimo_momento` | `fecha` (date) | `comedor_bajas` | `dias` (text[]) | ISO → ["DD/MM/YYYY"] |
| `comedor_cancelaciones_ultimo_momento` | `hijo_id` | `comedor_bajas` | `hijo_id` | Directo |
| `comedor_cancelaciones_ultimo_momento` | `padre_id` | `comedor_bajas` | `padre_id` | Directo |
| `comedor_cancelaciones_ultimo_momento` | `motivo` | `comedor_bajas` | `motivo_baja` | Directo o "Cancelación de último momento" |
| `comedor_cancelaciones_ultimo_momento` | `cancelado_por` | `comedor_bajas` | `user_id` | Directo |
| `comedor_cancelaciones_ultimo_momento` | `created_at` | `comedor_bajas` | `fecha_creacion` | Directo |
| `hijos.nombre` / `padres.nombre` | - | `comedor_bajas` | `hijo` | Lookup desde ID |
| `hijos.grado.nombre` | - | `comedor_bajas` | `curso` | Lookup o "Personal del colegio" |

## Consideraciones Técnicas

1. **Integridad referencial:** Los scripts verifican que los IDs de hijos y padres existan antes de migrar.

2. **Formato de fechas:** Las fechas se convierten automáticamente de ISO (YYYY-MM-DD) a español (DD/MM/YYYY) para mantener consistencia.

3. **Manejo de errores:** Si un registro falla, se registra el error pero continúa con los demás.

4. **Personal del colegio:** Las cancelaciones de personal se identifican automáticamente y se etiquetan con "Personal del colegio" como curso.

5. **Preservación de datos:** Todos los campos relevantes se mantienen (IDs, usuario que canceló, fecha de creación).

## Resultado Actual

```
📊 Total de cancelaciones encontradas: 0
✅ No hay cancelaciones que migrar.
```

No se perdieron datos porque la tabla estaba vacía antes del cambio de sistema.
