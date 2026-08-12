// ============================================
// public/api.js - Cliente API para ERP Nexus (COMPLETO)
// ============================================

const API_BASE = '../api/index.php?action=';

// --- Gestión de sesión ---
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function getCurrentUser() {
    const user = localStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('usuario', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'login.html';
}

// --- Petición genérica (mejorada) ---
async function apiRequest(action, method = 'GET', body = null) {
    const url = API_BASE + action;
    const token = getToken();
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (token || '')
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ Respuesta no es JSON. Contenido:', text.substring(0, 500));
            if (text.includes('<b>')) {
                alert('Error del servidor (PHP). Revisa la consola para más detalles.');
            } else {
                alert('La respuesta del servidor no es JSON válido.');
            }
            throw new Error('Respuesta no JSON');
        }

        if (!response.ok) {
            if (response.status === 401) {
                alert('Sesión expirada. Inicia sesión nuevamente.');
                logout();
                return null;
            }
            throw new Error(data.error || 'Error en la petición');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        if (!error.message.includes('no es JSON')) {
            alert('Error de conexión: ' + error.message);
        }
        return null;
    }
}

// --- Login ---
async function login(email, password) {
    const response = await fetch(API_BASE + 'login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('❌ Error en login, respuesta no JSON:', text);
        throw new Error('Error del servidor. Revisa la consola.');
    }
    if (!response.ok) {
        throw new Error(data.error || 'Error de autenticación');
    }
    return data;
}

// --- Usuarios ---
async function getUsuarios() {
    return await apiRequest('usuarios');
}
async function getUsuario(id) {
    return await apiRequest('usuarios&id=' + id);
}
async function createUsuario(data) {
    return await apiRequest('usuarios', 'POST', data);
}
async function updateUsuario(id, data) {
    return await apiRequest('usuarios&id=' + id, 'PUT', data);
}
async function deleteUsuario(id) {
    return await apiRequest('usuarios&id=' + id, 'DELETE');
}

// --- Clientes ---
async function getClientes() {
    return await apiRequest('clientes');
}
async function getCliente(id) {
    return await apiRequest('clientes&id=' + id);
}
async function createCliente(data) {
    return await apiRequest('clientes', 'POST', data);
}
async function updateCliente(id, data) {
    return await apiRequest('clientes&id=' + id, 'PUT', data);
}
async function deleteCliente(id) {
    return await apiRequest('clientes&id=' + id, 'DELETE');
}

// --- Productos ---
async function getProductos() {
    return await apiRequest('productos');
}
async function getProducto(id) {
    return await apiRequest('productos&id=' + id);
}
async function createProducto(data) {
    return await apiRequest('productos', 'POST', data);
}
async function updateProducto(id, data) {
    return await apiRequest('productos&id=' + id, 'PUT', data);
}
async function deleteProducto(id) {
    return await apiRequest('productos&id=' + id, 'DELETE');
}

// --- Pedidos ---
async function getPedidos() {
    return await apiRequest('pedidos');
}
async function getPedido(id) {
    return await apiRequest('pedidos&id=' + id);
}
async function createPedido(data) {
    return await apiRequest('pedidos', 'POST', data);
}
async function updatePedido(id, data) {
    return await apiRequest('pedidos&id=' + id, 'PUT', data);
}
async function deletePedido(id) {
    return await apiRequest('pedidos&id=' + id, 'DELETE');
}

// --- Fórmulas ---
async function getFormulas() {
    return await apiRequest('formulas');
}
async function getFormula(id) {
    return await apiRequest('formulas&id=' + id);
}
async function createFormula(data) {
    return await apiRequest('formulas', 'POST', data);
}
async function updateFormula(id, data) {
    return await apiRequest('formulas&id=' + id, 'PUT', data);
}
async function deleteFormula(id) {
    return await apiRequest('formulas&id=' + id, 'DELETE');
}

// --- Proveedores (COMPLETO) ---
async function getProveedores() {
    return await apiRequest('proveedores');
}
// <-- NUEVA: obtener proveedor por ID
async function getProveedor(id) {
    return await apiRequest('proveedores&id=' + id);
}
async function createProveedor(data) {
    return await apiRequest('proveedores', 'POST', data);
}
async function updateProveedor(id, data) {
    return await apiRequest('proveedores&id=' + id, 'PUT', data);
}
async function deleteProveedor(id) {
    return await apiRequest('proveedores&id=' + id, 'DELETE');
}

// --- Compras (COMPLETO) ---
async function getCompras() {
    return await apiRequest('compras');
}
// <-- NUEVA: obtener compra por ID
async function getCompra(id) {
    return await apiRequest('compras&id=' + id);
}
async function createCompra(data) {
    return await apiRequest('compras', 'POST', data);
}
async function updateCompra(id, data) {
    return await apiRequest('compras&id=' + id, 'PUT', data);
}
async function deleteCompra(id) {
    return await apiRequest('compras&id=' + id, 'DELETE');
}

// --- Cotizaciones ---
async function getCotizaciones() {
    return await apiRequest('cotizaciones');
}
async function getCotizacion(id) {
    return await apiRequest('cotizaciones&id=' + id);
}
async function createCotizacion(data) {
    return await apiRequest('cotizaciones', 'POST', data);
}
async function updateCotizacion(id, data) {
    return await apiRequest('cotizaciones&id=' + id, 'PUT', data);
}
async function deleteCotizacion(id) {
    return await apiRequest('cotizaciones&id=' + id, 'DELETE');
}

// --- Comprobantes ---
async function getComprobantes() {
    return await apiRequest('comprobantes');
}
async function getComprobante(id) {
    return await apiRequest('comprobantes&id=' + id);
}
async function createComprobante(data) {
    return await apiRequest('comprobantes', 'POST', data);
}
async function updateComprobante(id, data) {
    return await apiRequest('comprobantes&id=' + id, 'PUT', data);
}
async function deleteComprobante(id) {
    return await apiRequest('comprobantes&id=' + id, 'DELETE');
}

// --- Caja ---
async function getCajaActual() {
    return await apiRequest('caja');
}
async function getCaja(id) {
    return await apiRequest('caja&id=' + id);
}
async function createCaja(data) {
    return await apiRequest('caja', 'POST', data);
}
async function updateCaja(id, data) {
    return await apiRequest('caja&id=' + id, 'PUT', data);
}

// --- Movimientos de Caja ---
async function getMovimientos(params) {
    let query = 'movimientos';
    if (params) {
        const partes = [];
        if (params.caja_id) partes.push('caja_id=' + params.caja_id);
        if (params.fecha_desde) partes.push('fecha_desde=' + params.fecha_desde);
        if (params.fecha_hasta) partes.push('fecha_hasta=' + params.fecha_hasta);
        if (params.tipo) partes.push('tipo=' + params.tipo);
        if (partes.length) query += '&' + partes.join('&');
    }
    return await apiRequest(query);
}
async function getMovimiento(id) {
    return await apiRequest('movimientos&id=' + id);
}
async function createMovimiento(data) {
    return await apiRequest('movimientos', 'POST', data);
}
async function deleteMovimiento(id) {
    return await apiRequest('movimientos&id=' + id, 'DELETE');
}

// --- Trazabilidad ---
async function getTrazabilidad(id) {
    return await apiRequest('productos&uso=1&id=' + id);
}

console.log('✅ api.js cargado correctamente');