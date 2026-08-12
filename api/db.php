<?php
// api/db.php (actualizado con migración para usuario_id en compras)
require_once __DIR__ . '/config.php';

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        try {
            $this->pdo = new PDO('sqlite:' . DB_FILE);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->crearTablas();
            $this->migrarTablas();
        } catch (PDOException $e) {
            die('Error de conexión a la BD: ' . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    private function crearTablas() {
        $sql = "
            -- Usuarios
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                rol TEXT NOT NULL,
                estado TEXT DEFAULT 'activo'
            );

            -- Permisos
            CREATE TABLE IF NOT EXISTS permisos (
                usuario_id INTEGER,
                modulo TEXT,
                PRIMARY KEY (usuario_id, modulo),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );

            -- Clientes
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                ruc TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Productos
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE,
                nombre TEXT NOT NULL,
                categoria TEXT,
                cantidad REAL DEFAULT 0,
                precio REAL DEFAULT 0,
                estado TEXT DEFAULT 'activo',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Pedidos
            CREATE TABLE IF NOT EXISTS pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
            );

            -- Items de pedido
            CREATE TABLE IF NOT EXISTS pedido_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario REAL NOT NULL,
                FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );

            -- Fórmulas
            CREATE TABLE IF NOT EXISTS formulas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                estado TEXT DEFAULT 'activo',
                tamano_batch REAL NOT NULL,
                unidades_batch INTEGER DEFAULT 0,
                contenido_neto REAL DEFAULT 0,
                observaciones TEXT,
                producto_terminado_id INTEGER
            );

            -- Ingredientes de fórmula
            CREATE TABLE IF NOT EXISTS formula_ingredientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                formula_id INTEGER NOT NULL,
                materia_prima_id INTEGER NOT NULL,
                porcentaje REAL NOT NULL,
                cantidad_batch REAL NOT NULL,
                FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE,
                FOREIGN KEY (materia_prima_id) REFERENCES productos(id)
            );

            -- Proveedores
            CREATE TABLE IF NOT EXISTS proveedores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                contacto TEXT,
                categoria TEXT,
                telefono TEXT,
                email TEXT,
                estado TEXT DEFAULT 'activo'
            );

            -- Compras (con usuario_id)
            CREATE TABLE IF NOT EXISTS compras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proveedor_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                total REAL DEFAULT 0,
                estado TEXT DEFAULT 'recibido',
                usuario_id INTEGER,
                FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            );

            -- Detalles de compra
            CREATE TABLE IF NOT EXISTS compra_detalles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                compra_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                subtotal REAL DEFAULT 0,
                FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );

            -- COTIZACIONES
            CREATE TABLE IF NOT EXISTS cotizaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
            );

            -- Items de cotización
            CREATE TABLE IF NOT EXISTS cotizacion_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cotizacion_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );

            -- COMPROBANTES ELECTRÓNICOS
            CREATE TABLE IF NOT EXISTS comprobantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT NOT NULL,
                tipo TEXT NOT NULL,
                cliente_id INTEGER NOT NULL,
                fecha DATE NOT NULL,
                total REAL DEFAULT 0,
                estado TEXT DEFAULT 'emitido',
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
            );

            -- Items de comprobante
            CREATE TABLE IF NOT EXISTS comprobante_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                comprobante_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id) ON DELETE CASCADE,
                FOREIGN KEY (producto_id) REFERENCES productos(id)
            );

            -- CAJA
            CREATE TABLE IF NOT EXISTS caja (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                estado TEXT DEFAULT 'cerrada',
                monto_inicial REAL DEFAULT 0,
                monto_actual REAL DEFAULT 0,
                monto_final REAL DEFAULT 0,
                fecha_apertura DATETIME,
                fecha_cierre DATETIME
            );

            -- MOVIMIENTOS DE CAJA
            CREATE TABLE IF NOT EXISTS movimientos_caja (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caja_id INTEGER NOT NULL,
                tipo TEXT NOT NULL,
                concepto TEXT NOT NULL,
                monto REAL NOT NULL,
                fecha DATE NOT NULL,
                FOREIGN KEY (caja_id) REFERENCES caja(id) ON DELETE CASCADE
            );
        ";
        $this->pdo->exec($sql);
    }

    private function migrarTablas() {
        // Agregar columna ruc a clientes si no existe
        $check = $this->pdo->query("PRAGMA table_info(clientes)");
        $columns = $check->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('ruc', $columns)) {
            $this->pdo->exec('ALTER TABLE clientes ADD COLUMN ruc TEXT');
        }

        // Agregar columna producto_terminado_id a formulas si no existe
        $check = $this->pdo->query("PRAGMA table_info(formulas)");
        $columns = $check->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('producto_terminado_id', $columns)) {
            $this->pdo->exec('ALTER TABLE formulas ADD COLUMN producto_terminado_id INTEGER');
        }

        // Agregar columna estado a productos si no existe
        $check = $this->pdo->query("PRAGMA table_info(productos)");
        $columns = $check->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('estado', $columns)) {
            $this->pdo->exec('ALTER TABLE productos ADD COLUMN estado TEXT DEFAULT "activo"');
        }

        // Agregar columna usuario_id a compras si no existe
        $check = $this->pdo->query("PRAGMA table_info(compras)");
        $columns = $check->fetchAll(PDO::FETCH_COLUMN, 1);
        if (!in_array('usuario_id', $columns)) {
            $this->pdo->exec('ALTER TABLE compras ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)');
        }
    }
}

function getDB() {
    return Database::getInstance()->getConnection();
}
?>