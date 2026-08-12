<?php
// api/index.php (con verificación de estado activo)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$action = $_GET['action'] ?? '';

// --- LOGIN (sin token) ---
if ($action === 'login') {
    require_once __DIR__ . '/auth.php';
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';

    $db = getDB();
    // Buscar usuario activo
    $stmt = $db->prepare('SELECT * FROM usuarios WHERE email = ? AND estado = "activo"');
    $stmt->execute([$email]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        // Verificar si el usuario existe pero está inactivo
        $stmtCheck = $db->prepare('SELECT estado FROM usuarios WHERE email = ?');
        $stmtCheck->execute([$email]);
        $userState = $stmtCheck->fetchColumn();
        if ($userState === 'inactivo') {
            http_response_code(403);
            echo json_encode(['error' => 'Tu cuenta está inactiva. Contacta al administrador.']);
            exit;
        }
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        exit;
    }

    if (!password_verify($password, $usuario['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales inválidas']);
        exit;
    }

    $token = generarToken($usuario);
    echo json_encode([
        'token' => $token,
        'usuario' => [
            'id' => $usuario['id'],
            'nombre' => $usuario['nombre'],
            'rol' => $usuario['rol'],
            'permisos' => obtenerPermisos($usuario['id'])
        ]
    ]);
    exit;
}

// --- EL RESTO (con token) ---
$usuario = validarToken();

switch ($action) {
    case 'usuarios':
        require_once __DIR__ . '/usuarios.php';
        break;
    case 'clientes':
        require_once __DIR__ . '/clientes.php';
        break;
    case 'productos':
        require_once __DIR__ . '/productos.php';
        break;
    case 'pedidos':
        require_once __DIR__ . '/pedidos.php';
        break;
    case 'formulas':
        require_once __DIR__ . '/formulas.php';
        break;
    case 'proveedores':
        require_once __DIR__ . '/proveedores.php';
        break;
    case 'producir':
        require_once __DIR__ . '/producir.php';
        break;
    case 'compras':
        require_once __DIR__ . '/compras.php';
        break;
    case 'cotizaciones':
        require_once __DIR__ . '/cotizaciones.php';
        break;
    case 'comprobantes':
        require_once __DIR__ . '/comprobantes.php';
        break;
    case 'caja':
        require_once __DIR__ . '/caja.php';
        break;
    case 'movimientos':
        require_once __DIR__ . '/movimientos.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Acción no encontrada']);
}
?>