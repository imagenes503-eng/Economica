-- =====================================================================
--  DESPENSA ECONÓMICA — Supabase Schema
--  Ejecuta este SQL en: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
--  TABLA: productos
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id       TEXT PRIMARY KEY,
  nom      TEXT        NOT NULL DEFAULT '',
  cat      TEXT                 DEFAULT '',
  compra   NUMERIC(10,3)        DEFAULT 0,
  venta    NUMERIC(10,3)        DEFAULT 0,
  stock    INTEGER              DEFAULT 0,
  min      INTEGER              DEFAULT 0,
  cod      TEXT                 DEFAULT '',
  abrev    TEXT                 DEFAULT '',
  img      TEXT,                          -- base64 o URL de imagen
  paquetes JSONB                DEFAULT '[]',
  lotes    JSONB                DEFAULT '[]',
  updated_at TIMESTAMPTZ        DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
--  TABLA: ventas  (historial de cobros del POS)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id        TEXT PRIMARY KEY,
  fecha_iso TIMESTAMPTZ,
  total     NUMERIC(10,2) DEFAULT 0,
  pago      NUMERIC(10,2) DEFAULT 0,
  vuelto    NUMERIC(10,2) DEFAULT 0,
  items     TEXT          DEFAULT '',     -- "2x Leche | 1x Azúcar"
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
--  TABLA: ventas_diarias  (registro manual de ventas por día)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas_diarias (
  fecha      TEXT PRIMARY KEY,            -- 'YYYY-MM-DD'
  monto      NUMERIC(10,2) DEFAULT 0,
  nota       TEXT          DEFAULT '',
  updated_at TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
--  ÍNDICES para rendimiento
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas (fecha_iso DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_diarias_fecha ON ventas_diarias (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_productos_cat ON productos (cat);

-- ─────────────────────────────────────────────────────────────────────
--  ROW LEVEL SECURITY (RLS) — Habilitar y configurar acceso
--  Permite que cualquiera con la anon key pueda leer/escribir.
--  Para mayor seguridad, restringe por IP o usa service_role key.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE productos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_diarias ENABLE ROW LEVEL SECURITY;

-- Políticas: acceso total con anon key (igual que Google Sheets público)
CREATE POLICY "acceso_publico_productos"
  ON productos FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "acceso_publico_ventas"
  ON ventas FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "acceso_publico_ventas_diarias"
  ON ventas_diarias FOR ALL
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
--  TRIGGER: actualizar updated_at automáticamente
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ventas_diarias_updated_at
  BEFORE UPDATE ON ventas_diarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
