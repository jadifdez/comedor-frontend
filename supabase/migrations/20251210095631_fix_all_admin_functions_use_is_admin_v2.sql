/*
  # Fix all admin RPC functions to use is_admin() check

  1. Changes
    - Drop and recreate all admin_* functions to use is_admin() instead of hardcoded emails
    - Affects menu management, inscriptions, and daily management functions
  
  2. Functions Updated
    - admin_load_all_opciones_principales
    - admin_load_all_opciones_guarnicion
    - admin_insert_opcion_principal
    - admin_insert_opcion_guarnicion
    - admin_update_opcion_principal
    - admin_update_opcion_guarnicion
    - admin_update_opcion_principal_activo
    - admin_update_opcion_guarnicion_activo
    - admin_delete_opcion_principal
    - admin_delete_opcion_guarnicion
    - admin_load_all_inscripciones
    - admin_insert_opcion_principal_multi_dias
  
  3. Security
    - All functions check administradores table with activo=true
    - More flexible and maintainable than hardcoded emails
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS admin_load_all_opciones_principales();
DROP FUNCTION IF EXISTS admin_load_all_opciones_guarnicion();
DROP FUNCTION IF EXISTS admin_insert_opcion_principal(text, integer, integer, boolean);
DROP FUNCTION IF EXISTS admin_insert_opcion_guarnicion(text, integer, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_principal(uuid, text, integer, integer, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_guarnicion(uuid, text, integer, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_principal_activo(uuid, boolean);
DROP FUNCTION IF EXISTS admin_update_opcion_guarnicion_activo(uuid, boolean);
DROP FUNCTION IF EXISTS admin_delete_opcion_principal(uuid);
DROP FUNCTION IF EXISTS admin_delete_opcion_guarnicion(uuid);
DROP FUNCTION IF EXISTS admin_load_all_inscripciones();
DROP FUNCTION IF EXISTS admin_insert_opcion_principal_multi_dias(text, integer[], integer, boolean);

-- Recreate admin_load_all_opciones_principales
CREATE FUNCTION admin_load_all_opciones_principales()
RETURNS TABLE (
  id uuid,
  dia_semana integer,
  nombre text,
  activo boolean,
  orden integer,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.dia_semana,
    o.nombre,
    o.activo,
    o.orden,
    o.created_at
  FROM opciones_menu_principal o
  ORDER BY o.dia_semana, o.orden;
END;
$$;

-- Recreate admin_load_all_opciones_guarnicion
CREATE FUNCTION admin_load_all_opciones_guarnicion()
RETURNS TABLE (
  id uuid,
  nombre text,
  activo boolean,
  orden integer,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.nombre,
    o.activo,
    o.orden,
    o.created_at
  FROM opciones_menu_guarnicion o
  ORDER BY o.orden;
END;
$$;

-- Recreate admin_insert_opcion_principal
CREATE FUNCTION admin_insert_opcion_principal(
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean DEFAULT true
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  INSERT INTO opciones_menu_principal (nombre, dia_semana, orden, activo)
  VALUES (new_nombre, new_dia_semana, new_orden, new_activo)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Recreate admin_insert_opcion_guarnicion
CREATE FUNCTION admin_insert_opcion_guarnicion(
  new_nombre text,
  new_orden integer,
  new_activo boolean DEFAULT true
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  INSERT INTO opciones_menu_guarnicion (nombre, orden, activo)
  VALUES (new_nombre, new_orden, new_activo)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Recreate admin_update_opcion_principal
CREATE FUNCTION admin_update_opcion_principal(
  opcion_id uuid,
  new_nombre text,
  new_dia_semana integer,
  new_orden integer,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE opciones_menu_principal 
  SET 
    nombre = new_nombre,
    dia_semana = new_dia_semana,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_update_opcion_guarnicion
CREATE FUNCTION admin_update_opcion_guarnicion(
  opcion_id uuid,
  new_nombre text,
  new_orden integer,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE opciones_menu_guarnicion 
  SET 
    nombre = new_nombre,
    orden = new_orden,
    activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_update_opcion_principal_activo
CREATE FUNCTION admin_update_opcion_principal_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE opciones_menu_principal 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_update_opcion_guarnicion_activo
CREATE FUNCTION admin_update_opcion_guarnicion_activo(
  opcion_id uuid,
  new_activo boolean
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  UPDATE opciones_menu_guarnicion 
  SET activo = new_activo
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_delete_opcion_principal
CREATE FUNCTION admin_delete_opcion_principal(
  opcion_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  DELETE FROM opciones_menu_principal 
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_delete_opcion_guarnicion
CREATE FUNCTION admin_delete_opcion_guarnicion(
  opcion_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  DELETE FROM opciones_menu_guarnicion 
  WHERE id = opcion_id;
END;
$$;

-- Recreate admin_load_all_inscripciones
CREATE FUNCTION admin_load_all_inscripciones()
RETURNS TABLE (
  id uuid,
  hijo_id uuid,
  dias_semana integer[],
  precio_diario decimal(5,2),
  activo boolean,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.hijo_id,
    i.dias_semana,
    i.precio_diario,
    i.activo,
    i.fecha_inicio,
    i.fecha_fin,
    i.created_at,
    i.updated_at
  FROM inscripciones_comedor i
  ORDER BY i.created_at DESC;
END;
$$;

-- Recreate admin_insert_opcion_principal_multi_dias
CREATE FUNCTION admin_insert_opcion_principal_multi_dias(
  new_nombre text,
  dias_semana integer[],
  new_orden integer,
  new_activo boolean DEFAULT true
)
RETURNS uuid[]
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_ids uuid[];
  dia integer;
  new_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  new_ids := ARRAY[]::uuid[];

  FOREACH dia IN ARRAY dias_semana
  LOOP
    INSERT INTO opciones_menu_principal (nombre, dia_semana, orden, activo)
    VALUES (new_nombre, dia, new_orden, new_activo)
    RETURNING id INTO new_id;
    
    new_ids := array_append(new_ids, new_id);
  END LOOP;

  RETURN new_ids;
END;
$$;
