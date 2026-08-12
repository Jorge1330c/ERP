<?php
// api/productos.php (con trazabilidad)
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;
$uso = isset($_GET['uso']) ? intval($_GET['uso']) : 0;

$usuario = verificarPermiso('inventario');

// --- GET ---
if ($method === 'GET') {
    // Si se solicita trazabilidad (uso=1)
    if ($uso && $id) {
        $producto = obtenerProducto($id);
        if (!$producto) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
            exit;
        }
        $trazabilidad = obtenerTrazabilidad($id);
        echo json_encode([
            'producto' => $producto,
            'trazabilidad' => $trazabilidad
        ]);
        exit;
    }

    // GET normal: listar o obtener un producto
    if ($id) {
        $producto = obtenerProducto($id);
        if (!$producto) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
            exit;
        }
        echo json_encode($producto);
    } else {
        $stmt = $db->query('SELECT * FROM productos ORDER BY nombre');
        echo json_encode($stmt->fetchAll());
    }
    exit;
}

// --- POST (crear) ---
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $codigo = trim($input['codigo'] ?? '');
    $nombre = trim($input['nombre'] ?? '');
    $categoria = trim($input['categoria'] ?? '');
    $cantidad = floatval($input['cantidad'] ?? 0);
    $precio = floatval($input['precio'] ?? 0);
    $estado = $input['estado'] ?? 'activo';

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre es obligatorio']);
        exit;
    }

    $stmt = $db->prepare('INSERT INTO productos (codigo, nombre, categoria, cantidad, precio, estado) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$codigo, $nombre, $categoria, $cantidad, $precio, $estado]);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Producto creado']);
    exit;
}

// --- PUT (actualizar) ---
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    $input = json_decode(file_get_contents('php://input'), true);
    $codigo = trim($input['codigo'] ?? '');
    $nombre = trim($input['nombre'] ?? '');
    $categoria = trim($input['categoria'] ?? '');
    $cantidad = floatval($input['cantidad'] ?? 0);
    $precio = floatval($input['precio'] ?? 0);
    $estado = $input['estado'] ?? 'activo';

    if (empty($nombre)) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre es obligatorio']);
        exit;
    }

    $stmt = $db->prepare('UPDATE productos SET codigo = ?, nombre = ?, categoria = ?, cantidad = ?, precio = ?, estado = ? WHERE id = ?');
    $stmt->execute([$codigo, $nombre, $categoria, $cantidad, $precio, $estado, $id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado o sin cambios']);
        exit;
    }
    echo json_encode(['message' => 'Producto actualizado']);
    exit;
}

// --- DELETE ---
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID requerido']);
        exit;
    }
    // Verificar dependencias
    $check = $db->prepare('SELECT COUNT(*) FROM pedido_items WHERE producto_id = ?');
    $check->execute([$id]);
    if ($check->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'El producto está siendo usado en pedidos y no puede eliminarse']);
        exit;
    }
    $check2 = $db->prepare('SELECT COUNT(*) FROM formula_ingredientes WHERE materia_prima_id = ?');
    $check2->execute([$id]);
    if ($check2->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'El producto está siendo usado en fórmulas y no puede eliminarse']);
        exit;
    }
    $check3 = $db->prepare('SELECT COUNT(*) FROM formulas WHERE producto_terminado_id = ?');
    $check3->execute([$id]);
    if ($check3->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'El producto es producto terminado de una fórmula y no puede eliminarse']);
        exit;
    }

    $stmt = $db->prepare('DELETE FROM productos WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit;
    }
    echo json_encode(['message' => 'Producto eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);

// ============================================
// FUNCIONES DE TRAZABILIDAD
// ============================================

function obtenerProducto($id) {
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM productos WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function obtenerTrazabilidad($productoId) {
    $db = getDB();
    $resultado = [
        'compras' => [],
        'formulas_como_mp' => [],
        'formulas_como_pt' => [],
        'pedidos' => [],
        'comprobantes' => []
    ];

    // 1. Compras donde aparece este producto
    $stmt = $db->prepare('
        SELECT c.id, c.fecha, c.total, c.estado, 
               cd.cantidad, cd.precio_unitario, cd.subtotal,
               p.nombre as proveedor
        FROM compra_detalles cd
        JOIN compras c ON cd.compra_id = c.id
        LEFT JOIN proveedores p ON c.proveedor_id = p.id
        WHERE cd.producto_id = ?
        ORDER BY c.fecha DESC
    ');
    $stmt->execute([$productoId]);
    $resultado['compras'] = $stmt->fetchAll();

    // 2. Fórmulas donde es materia prima
    $stmt = $db->prepare('
        SELECT f.id, f.nombre, f.estado, f.tamano_batch,
               fi.porcentaje, fi.cantidad_batch
        FROM formula_ingredientes fi
        JOIN formulas f ON fi.formula_id = f.id
        WHERE fi.materia_prima_id = ?
        ORDER BY f.nombre
    ');
    $stmt->execute([$productoId]);
    $resultado['formulas_como_mp'] = $stmt->fetchAll();

    // 3. Fórmulas donde es producto terminado
    $stmt = $db->prepare('
        SELECT id, nombre, estado, tamano_batch, unidades_batch
        FROM formulas
        WHERE producto_terminado_id = ?
        ORDER BY nombre
    ');
    $stmt->execute([$productoId]);
    $resultado['formulas_como_pt'] = $stmt->fetchAll();

    // 4. Pedidos donde se ha vendido (como producto terminado)
    $stmt = $db->prepare('
        SELECT p.id, p.fecha, p.estado, 
               pi.cantidad, pi.precio_unitario,
               c.nombre as cliente
        FROM pedido_items pi
        JOIN pedidos p ON pi.pedido_id = p.id
        LEFT JOIN clientes c ON p.cliente_id = c.id
        WHERE pi.producto_id = ?
        ORDER BY p.fecha DESC
    ');
    $stmt->execute([$productoId]);
    $resultado['pedidos'] = $stmt->fetchAll();

    // 5. Comprobantes donde aparece
    $stmt = $db->prepare('
        SELECT cm.id, cm.numero, cm.tipo, cm.fecha, cm.total, cm.estado,
               ci.cantidad, ci.precio_unitario,
               cl.nombre as cliente
        FROM comprobante_items ci
        JOIN comprobantes cm ON ci.comprobante_id = cm.id
        LEFT JOIN clientes cl ON cm.cliente_id = cl.id
        WHERE ci.producto_id = ?
        ORDER BY cm.fecha DESC
    ');
    $stmt->execute([$productoId]);
    $resultado['comprobantes'] = $stmt->fetchAll();

    return $resultado;
}
?>