// ============================================
// public/ventas.js - Ventas con Pedidos, Cotizaciones y Comprobantes (CORREGIDO)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('ventas')) {
        alert('Acceso denegado: no tienes permiso para Ventas.');
        window.location.href = 'index.html';
        return;
    }

    // --- Datos globales ---
    let clientes = [];
    let productos = [];
    let pedidos = [];
    let cotizaciones = [];
    let comprobantes = [];

    // --- Elementos comunes ---
    const exportBtn = document.getElementById('exportBtn');
    const openAddBtn = document.getElementById('openAddModal');

    // ============================================
    // Funciones auxiliares
    // ============================================
    function getClienteNombre(id) {
        const c = clientes.find(cl => cl.id === id);
        return c ? c.nombre : 'Desconocido';
    }

    function getProductoNombre(id) {
        const p = productos.find(pr => pr.id === id);
        return p ? p.nombre : 'Producto eliminado';
    }

    function formatCurrency(value) {
        return '$ ' + Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function calcularTotal(items) {
        return items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    }

    // ============================================
    // Carga de datos comunes (clientes, productos)
    // ============================================
    async function loadCommonData() {
        try {
            const [clientesData, productosData] = await Promise.all([
                getClientes(),
                getProductos()
            ]);
            if (clientesData) clientes = clientesData;
            if (productosData) productos = productosData;
            populateAllSelects();
        } catch (error) {
            console.error('Error cargando datos comunes:', error);
        }
    }

    // ============================================
    // Poblar selects de clientes y productos
    // ============================================
    function populateAllSelects() {
        // Clientes
        const clientSelects = [
            document.getElementById('cliente'),
            document.getElementById('cotCliente'),
            document.getElementById('compCliente'),
            document.getElementById('clientFilter'),
            document.getElementById('cotizacionClientFilter')
        ];
        clientSelects.forEach(sel => {
            if (!sel) return;
            const current = sel.value;
            sel.innerHTML = '<option value="">' +
                (sel.id === 'cliente' || sel.id === 'cotCliente' || sel.id === 'compCliente' ? 'Seleccionar' : 'Todos') +
                '</option>';
            clientes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre;
                sel.appendChild(opt);
            });
            if (current) sel.value = current;
        });

        // Productos (para los templates dinámicos)
        document.querySelectorAll('.item-producto, .cot-producto, .comp-producto').forEach(sel => {
            populateProductSelect(sel);
        });
    }

    function populateProductSelect(sel) {
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">Seleccionar</option>';
        productos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre + (p.cantidad !== undefined ? ' (Stock: ' + p.cantidad + ')' : '');
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    }

    // ============================================
    // FUNCIONES PARA OBTENER DATOS (local o API)
    // ============================================
    async function obtenerPedido(id) {
        let p = pedidos.find(item => item.id === id);
        if (p) return p;
        try {
            p = await getPedido(id);
            if (p) pedidos.push(p);
            return p;
        } catch (e) { return null; }
    }

    async function obtenerCotizacion(id) {
        let c = cotizaciones.find(item => item.id === id);
        if (c) return c;
        try {
            c = await getCotizacion(id);
            if (c) cotizaciones.push(c);
            return c;
        } catch (e) { return null; }
    }

    async function obtenerComprobante(id) {
        let c = comprobantes.find(item => item.id === id);
        if (c) return c;
        try {
            c = await getComprobante(id);
            if (c) comprobantes.push(c);
            return c;
        } catch (e) { return null; }
    }

    // ============================================
    // 1. PEDIDOS
    // ============================================
    const pedidoTbody = document.getElementById('pedidoTableBody');
    const pedidoCount = document.getElementById('pedidoCount');
    const totalVentas = document.getElementById('totalVentas');
    const totalPedidos = document.getElementById('totalPedidos');
    const pendientes = document.getElementById('pendientes');
    const completados = document.getElementById('completados');
    const statusFilter = document.getElementById('statusFilter');
    const clientFilter = document.getElementById('clientFilter');
    const applyFilters = document.getElementById('applyFilters');
    const resetFilters = document.getElementById('resetFilters');
    const searchInput = document.getElementById('globalSearch');

    // Modal pedido
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const editIdInput = document.getElementById('editId');
    const pedidoForm = document.getElementById('pedidoForm');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const clienteSelect = document.getElementById('cliente');
    const fechaInput = document.getElementById('fecha');
    const estadoPedidoSelect = document.getElementById('estadoPedido');
    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');
    const totalPedidoModal = document.getElementById('totalPedidoModal');

    let filtrosPedido = { search: '', status: '', cliente: '' };

    async function loadPedidos() {
        const data = await getPedidos();
        if (data) {
            pedidos = data;
            renderPedidos();
        }
    }

    function renderPedidos() {
        let filtered = [...pedidos];
        if (filtrosPedido.search.trim()) {
            const term = filtrosPedido.search.trim().toLowerCase();
            filtered = filtered.filter(p =>
                getClienteNombre(p.cliente_id).toLowerCase().includes(term) ||
                p.id.toString().includes(term)
            );
        }
        if (filtrosPedido.status) {
            filtered = filtered.filter(p => p.estado === filtrosPedido.status);
        }
        if (filtrosPedido.cliente) {
            filtered = filtered.filter(p => p.cliente_id === parseInt(filtrosPedido.cliente));
        }
        filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        pedidoTbody.innerHTML = '';
        filtered.forEach(p => {
            const total = calcularTotal(p.items || []);
            const estadoClass = {
                pendiente: 'status-pendiente',
                completado: 'status-completado',
                cancelado: 'status-cancelado',
                enviado: 'status-enviado'
            }[p.estado] || '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${p.id}</strong></td>
                <td>${getClienteNombre(p.cliente_id)}</td>
                <td>${p.fecha}</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge ${estadoClass}">${p.estado}</span></td>
                <td>
                    <button class="action-btn view" data-id="${p.id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-id="${p.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${p.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                    ${p.estado === 'pendiente' ? `<button class="action-btn complete" data-id="${p.id}" title="Marcar completado"><i class="fas fa-check"></i></button>` : ''}
                </td>
            `;
            pedidoTbody.appendChild(tr);
        });
        pedidoCount.textContent = filtered.length;
        updatePedidoSummary();

        // Eventos
        document.querySelectorAll('#pedidoTableBody .action-btn.view').forEach(btn => {
            btn.addEventListener('click', function () {
                verDetallePedido(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#pedidoTableBody .action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                abrirModalPedido(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#pedidoTableBody .action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Eliminar pedido #' + id + '?')) {
                    eliminarPedido(id);
                }
            });
        });
        document.querySelectorAll('#pedidoTableBody .action-btn.complete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Marcar pedido #' + id + ' como completado?')) {
                    actualizarEstadoPedido(id, 'completado');
                }
            });
        });
    }

    function updatePedidoSummary() {
        const total = pedidos.reduce((acc, p) => acc + calcularTotal(p.items || []), 0);
        totalVentas.textContent = formatCurrency(total);
        totalPedidos.textContent = pedidos.length;
        pendientes.textContent = pedidos.filter(p => p.estado === 'pendiente').length;
        completados.textContent = pedidos.filter(p => p.estado === 'completado').length;
    }

    async function actualizarEstadoPedido(id, estado) {
        const result = await updatePedido(id, { estado });
        if (result) loadPedidos();
    }

    async function eliminarPedido(id) {
        const result = await deletePedido(id);
        if (result) loadPedidos();
    }

    // --- Modal Pedido ---
    function abrirModalPedido(id = null) {
        if (id) {
            const pedido = pedidos.find(p => p.id === id);
            if (!pedido) return;
            modalTitle.textContent = 'Editar pedido #' + id;
            editIdInput.value = id;
            clienteSelect.value = pedido.cliente_id;
            fechaInput.value = pedido.fecha;
            estadoPedidoSelect.value = pedido.estado;
            itemsContainer.innerHTML = '';
            (pedido.items || []).forEach(item => {
                const row = crearFilaItemPedido(item.producto_id, item.cantidad, item.precio_unitario);
                itemsContainer.appendChild(row);
            });
            if (itemsContainer.children.length === 0) agregarFilaItemPedido();
        } else {
            modalTitle.textContent = 'Nuevo pedido';
            editIdInput.value = '';
            pedidoForm.reset();
            itemsContainer.innerHTML = '';
            fechaInput.value = new Date().toISOString().split('T')[0];
            estadoPedidoSelect.value = 'pendiente';
            agregarFilaItemPedido();
        }
        modalOverlay.classList.add('open');
        actualizarTotalPedidoModal();
    }

    function cerrarModalPedido() {
        modalOverlay.classList.remove('open');
        pedidoForm.reset();
        editIdInput.value = '';
        itemsContainer.innerHTML = '';
    }

    function crearFilaItemPedido(productoId = '', cantidad = 1, precio = '') {
        const template = document.getElementById('itemRowTemplate');
        const row = template.cloneNode(true);
        row.style.display = 'flex';
        row.id = '';
        const select = row.querySelector('.item-producto');
        populateProductSelect(select);
        if (productoId) select.value = productoId;
        const cantidadInput = row.querySelector('.item-cantidad');
        cantidadInput.value = cantidad;
        const precioInput = row.querySelector('.item-precio');
        if (precio) precioInput.value = precio;
        else if (productoId) {
            const p = productos.find(pr => pr.id === parseInt(productoId));
            if (p) precioInput.value = p.precio;
        }
        const updateRow = () => {
            const cant = parseFloat(cantidadInput.value) || 0;
            const prec = parseFloat(precioInput.value) || 0;
            row.querySelector('.item-subtotal').textContent = formatCurrency(cant * prec);
            actualizarTotalPedidoModal();
        };
        select.addEventListener('change', function () {
            const prodId = parseInt(this.value);
            if (prodId) {
                const p = productos.find(pr => pr.id === prodId);
                if (p) precioInput.value = p.precio;
            }
            updateRow();
        });
        cantidadInput.addEventListener('input', updateRow);
        precioInput.addEventListener('input', updateRow);
        row.querySelector('.item-remove').addEventListener('click', function () {
            if (itemsContainer.children.length > 1) {
                row.remove();
                actualizarTotalPedidoModal();
            } else {
                alert('Debe haber al menos un producto.');
            }
        });
        setTimeout(updateRow, 50);
        return row;
    }

    function agregarFilaItemPedido() {
        const row = crearFilaItemPedido();
        itemsContainer.appendChild(row);
        actualizarTotalPedidoModal();
    }

    function actualizarTotalPedidoModal() {
        let total = 0;
        document.querySelectorAll('#itemsContainer .item-row').forEach(row => {
            const cant = parseFloat(row.querySelector('.item-cantidad').value) || 0;
            const prec = parseFloat(row.querySelector('.item-precio').value) || 0;
            total += cant * prec;
        });
        totalPedidoModal.textContent = formatCurrency(total);
    }

    pedidoForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const cliente_id = parseInt(clienteSelect.value);
        const fecha = fechaInput.value;
        const estado = estadoPedidoSelect.value;
        const items = [];
        document.querySelectorAll('#itemsContainer .item-row').forEach(row => {
            const producto_id = parseInt(row.querySelector('.item-producto').value) || 0;
            const cantidad = parseFloat(row.querySelector('.item-cantidad').value) || 0;
            const precio_unitario = parseFloat(row.querySelector('.item-precio').value) || 0;
            if (producto_id > 0 && cantidad > 0 && precio_unitario >= 0) {
                items.push({ producto_id, cantidad, precio_unitario });
            }
        });
        if (!cliente_id || !fecha || items.length === 0) {
            alert('Completa todos los campos y agrega al menos un producto.');
            return;
        }
        const data = { cliente_id, fecha, estado, items };
        const editId = parseInt(editIdInput.value);
        if (editId) {
            await updatePedido(editId, data);
        } else {
            await createPedido(data);
        }
        cerrarModalPedido();
        loadPedidos();
    });

    // ============================================
    // 2. COTIZACIONES
    // ============================================
    const cotTbody = document.getElementById('cotizacionTableBody');
    const cotCount = document.getElementById('cotizacionCount');
    const totalCotizaciones = document.getElementById('totalCotizaciones');
    const cotAprobadas = document.getElementById('cotizacionesAprobadas');
    const cotPendientes = document.getElementById('cotizacionesPendientes');
    const cotStatusFilter = document.getElementById('cotizacionStatusFilter');
    const cotClientFilter = document.getElementById('cotizacionClientFilter');
    const applyCotFilters = document.getElementById('applyCotizacionFilters');
    const resetCotFilters = document.getElementById('resetCotizacionFilters');

    // Modal cotización
    const modalCotOverlay = document.getElementById('modalCotizacionOverlay');
    const modalCotTitle = document.getElementById('modalCotizacionTitle');
    const editCotId = document.getElementById('editCotizacionId');
    const cotForm = document.getElementById('cotizacionForm');
    const modalCotClose = document.getElementById('modalCotizacionClose');
    const modalCotCancel = document.getElementById('modalCotizacionCancel');
    const cotCliente = document.getElementById('cotCliente');
    const cotFecha = document.getElementById('cotFecha');
    const cotEstado = document.getElementById('cotEstado');
    const cotItemsContainer = document.getElementById('cotItemsContainer');
    const addCotItemBtn = document.getElementById('addCotItemBtn');
    const totalCotModal = document.getElementById('totalCotizacionModal');

    let filtrosCot = { estado: '', cliente: '' };

    async function loadCotizaciones() {
        const data = await getCotizaciones();
        if (data) {
            cotizaciones = data;
            renderCotizaciones();
        }
    }

    function renderCotizaciones() {
        let filtered = [...cotizaciones];
        if (filtrosCot.estado) {
            filtered = filtered.filter(c => c.estado === filtrosCot.estado);
        }
        if (filtrosCot.cliente) {
            filtered = filtered.filter(c => c.cliente_id === parseInt(filtrosCot.cliente));
        }
        filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        cotTbody.innerHTML = '';
        filtered.forEach(c => {
            const total = calcularTotal(c.items || []);
            const estadoClass = {
                pendiente: 'status-pendiente',
                aprobada: 'status-completado',
                rechazada: 'status-cancelado'
            }[c.estado] || '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${c.id}</strong></td>
                <td>${getClienteNombre(c.cliente_id)}</td>
                <td>${c.fecha}</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge ${estadoClass}">${c.estado}</span></td>
                <td>
                    <button class="action-btn view" data-id="${c.id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                    ${c.estado === 'pendiente' ? `<button class="action-btn approve" data-id="${c.id}" title="Aprobar"><i class="fas fa-check"></i></button>` : ''}
                </td>
            `;
            cotTbody.appendChild(tr);
        });
        cotCount.textContent = filtered.length;
        updateCotSummary();

        // Eventos
        document.querySelectorAll('#cotizacionTableBody .action-btn.view').forEach(btn => {
            btn.addEventListener('click', function () {
                verDetalleCotizacion(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#cotizacionTableBody .action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                abrirModalCotizacion(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#cotizacionTableBody .action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Eliminar cotización #' + id + '?')) {
                    eliminarCotizacion(id);
                }
            });
        });
        document.querySelectorAll('#cotizacionTableBody .action-btn.approve').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Aprobar cotización #' + id + '?')) {
                    actualizarEstadoCotizacion(id, 'aprobada');
                }
            });
        });
    }

    function updateCotSummary() {
        totalCotizaciones.textContent = cotizaciones.length;
        cotAprobadas.textContent = cotizaciones.filter(c => c.estado === 'aprobada').length;
        cotPendientes.textContent = cotizaciones.filter(c => c.estado === 'pendiente').length;
    }

    // ============================================
    // FUNCIÓN CORREGIDA: actualizar estado cotización
    // ============================================
    async function actualizarEstadoCotizacion(id, estado) {
        // Obtener la cotización completa (local o desde API)
        const cotizacion = await obtenerCotizacion(id);
        if (!cotizacion) {
            alert('No se pudo obtener la cotización para actualizar.');
            return;
        }
        // Enviar todos los campos con el nuevo estado
        const data = {
            cliente_id: cotizacion.cliente_id,
            fecha: cotizacion.fecha,
            estado: estado,
            items: cotizacion.items || []
        };
        const result = await updateCotizacion(id, data);
        if (result) loadCotizaciones();
    }

    async function eliminarCotizacion(id) {
        const result = await deleteCotizacion(id);
        if (result) loadCotizaciones();
    }

    // --- Modal Cotización ---
    function abrirModalCotizacion(id = null) {
        if (id) {
            const cot = cotizaciones.find(c => c.id === id);
            if (!cot) return;
            modalCotTitle.textContent = 'Editar cotización #' + id;
            editCotId.value = id;
            cotCliente.value = cot.cliente_id;
            cotFecha.value = cot.fecha;
            cotEstado.value = cot.estado;
            cotItemsContainer.innerHTML = '';
            (cot.items || []).forEach(item => {
                const row = crearFilaItemCot(item.producto_id, item.cantidad, item.precio_unitario);
                cotItemsContainer.appendChild(row);
            });
            if (cotItemsContainer.children.length === 0) agregarFilaItemCot();
        } else {
            modalCotTitle.textContent = 'Nueva cotización';
            editCotId.value = '';
            cotForm.reset();
            cotItemsContainer.innerHTML = '';
            cotFecha.value = new Date().toISOString().split('T')[0];
            cotEstado.value = 'pendiente';
            agregarFilaItemCot();
        }
        modalCotOverlay.classList.add('open');
        actualizarTotalCotModal();
    }

    function cerrarModalCotizacion() {
        modalCotOverlay.classList.remove('open');
        cotForm.reset();
        editCotId.value = '';
        cotItemsContainer.innerHTML = '';
    }

    function crearFilaItemCot(productoId = '', cantidad = 1, precio = '') {
        const template = document.getElementById('cotItemTemplate');
        const row = template.cloneNode(true);
        row.style.display = 'flex';
        row.id = '';
        const select = row.querySelector('.cot-producto');
        populateProductSelect(select);
        if (productoId) select.value = productoId;
        const cantidadInput = row.querySelector('.cot-cantidad');
        cantidadInput.value = cantidad;
        const precioInput = row.querySelector('.cot-precio');
        if (precio) precioInput.value = precio;
        else if (productoId) {
            const p = productos.find(pr => pr.id === parseInt(productoId));
            if (p) precioInput.value = p.precio;
        }
        const updateRow = () => {
            const cant = parseFloat(cantidadInput.value) || 0;
            const prec = parseFloat(precioInput.value) || 0;
            row.querySelector('.item-subtotal').textContent = formatCurrency(cant * prec);
            actualizarTotalCotModal();
        };
        select.addEventListener('change', function () {
            const prodId = parseInt(this.value);
            if (prodId) {
                const p = productos.find(pr => pr.id === prodId);
                if (p) precioInput.value = p.precio;
            }
            updateRow();
        });
        cantidadInput.addEventListener('input', updateRow);
        precioInput.addEventListener('input', updateRow);
        row.querySelector('.item-remove').addEventListener('click', function () {
            if (cotItemsContainer.children.length > 1) {
                row.remove();
                actualizarTotalCotModal();
            } else {
                alert('Debe haber al menos un producto.');
            }
        });
        setTimeout(updateRow, 50);
        return row;
    }

    function agregarFilaItemCot() {
        const row = crearFilaItemCot();
        cotItemsContainer.appendChild(row);
        actualizarTotalCotModal();
    }

    function actualizarTotalCotModal() {
        let total = 0;
        document.querySelectorAll('#cotItemsContainer .item-row').forEach(row => {
            const cant = parseFloat(row.querySelector('.cot-cantidad').value) || 0;
            const prec = parseFloat(row.querySelector('.cot-precio').value) || 0;
            total += cant * prec;
        });
        totalCotModal.textContent = formatCurrency(total);
    }

    cotForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const cliente_id = parseInt(cotCliente.value);
        const fecha = cotFecha.value;
        const estado = cotEstado.value;
        const items = [];
        document.querySelectorAll('#cotItemsContainer .item-row').forEach(row => {
            const producto_id = parseInt(row.querySelector('.cot-producto').value) || 0;
            const cantidad = parseFloat(row.querySelector('.cot-cantidad').value) || 0;
            const precio_unitario = parseFloat(row.querySelector('.cot-precio').value) || 0;
            if (producto_id > 0 && cantidad > 0 && precio_unitario >= 0) {
                items.push({ producto_id, cantidad, precio_unitario });
            }
        });
        if (!cliente_id || !fecha || items.length === 0) {
            alert('Completa todos los campos y agrega al menos un producto.');
            return;
        }
        const data = { cliente_id, fecha, estado, items };
        const editId = parseInt(editCotId.value);
        if (editId) {
            await updateCotizacion(editId, data);
        } else {
            await createCotizacion(data);
        }
        cerrarModalCotizacion();
        loadCotizaciones();
    });

    // ============================================
    // 3. COMPROBANTES
    // ============================================
    const compTbody = document.getElementById('comprobanteTableBody');
    const compCount = document.getElementById('comprobanteCount');
    const totalComprobantes = document.getElementById('totalComprobantes');
    const compEmitidos = document.getElementById('comprobantesEmitidos');
    const compPendientes = document.getElementById('comprobantesPendientes');
    const compTipoFilter = document.getElementById('comprobanteTipoFilter');
    const compEstadoFilter = document.getElementById('comprobanteEstadoFilter');
    const applyCompFilters = document.getElementById('applyComprobanteFilters');
    const resetCompFilters = document.getElementById('resetComprobanteFilters');

    // Modal comprobante
    const modalCompOverlay = document.getElementById('modalComprobanteOverlay');
    const modalCompTitle = document.getElementById('modalComprobanteTitle');
    const editCompId = document.getElementById('editComprobanteId');
    const compForm = document.getElementById('comprobanteForm');
    const modalCompClose = document.getElementById('modalComprobanteClose');
    const modalCompCancel = document.getElementById('modalComprobanteCancel');
    const compTipo = document.getElementById('compTipo');
    const compNumero = document.getElementById('compNumero');
    const compCliente = document.getElementById('compCliente');
    const compFecha = document.getElementById('compFecha');
    const compEstado = document.getElementById('compEstado');
    const compItemsContainer = document.getElementById('compItemsContainer');
    const addCompItemBtn = document.getElementById('addCompItemBtn');
    const totalCompModal = document.getElementById('totalComprobanteModal');

    let filtrosComp = { tipo: '', estado: '' };

    async function loadComprobantes() {
        const data = await getComprobantes();
        if (data) {
            comprobantes = data;
            renderComprobantes();
        }
    }

    function renderComprobantes() {
        let filtered = [...comprobantes];
        if (filtrosComp.tipo) {
            filtered = filtered.filter(c => c.tipo === filtrosComp.tipo);
        }
        if (filtrosComp.estado) {
            filtered = filtered.filter(c => c.estado === filtrosComp.estado);
        }
        filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        compTbody.innerHTML = '';
        filtered.forEach(c => {
            const total = calcularTotal(c.items || []);
            const estadoClass = {
                emitido: 'status-completado',
                pendiente: 'status-pendiente',
                anulado: 'status-cancelado'
            }[c.estado] || '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${c.id}</strong></td>
                <td>${c.numero}</td>
                <td>${c.tipo}</td>
                <td>${getClienteNombre(c.cliente_id)}</td>
                <td>${c.fecha}</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge ${estadoClass}">${c.estado}</span></td>
                <td>
                    <button class="action-btn view" data-id="${c.id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            `;
            compTbody.appendChild(tr);
        });
        compCount.textContent = filtered.length;
        updateCompSummary();

        document.querySelectorAll('#comprobanteTableBody .action-btn.view').forEach(btn => {
            btn.addEventListener('click', function () {
                verDetalleComprobante(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#comprobanteTableBody .action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                abrirModalComprobante(parseInt(this.dataset.id));
            });
        });
        document.querySelectorAll('#comprobanteTableBody .action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                if (confirm('¿Eliminar comprobante #' + id + '?')) {
                    eliminarComprobante(id);
                }
            });
        });
    }

    function updateCompSummary() {
        totalComprobantes.textContent = comprobantes.length;
        compEmitidos.textContent = comprobantes.filter(c => c.estado === 'emitido').length;
        compPendientes.textContent = comprobantes.filter(c => c.estado === 'pendiente').length;
    }

    async function eliminarComprobante(id) {
        const result = await deleteComprobante(id);
        if (result) loadComprobantes();
    }

    // --- Modal Comprobante ---
    function abrirModalComprobante(id = null) {
        if (id) {
            const comp = comprobantes.find(c => c.id === id);
            if (!comp) return;
            modalCompTitle.textContent = 'Editar comprobante #' + id;
            editCompId.value = id;
            compTipo.value = comp.tipo;
            compNumero.value = comp.numero;
            compCliente.value = comp.cliente_id;
            compFecha.value = comp.fecha;
            compEstado.value = comp.estado;
            compItemsContainer.innerHTML = '';
            (comp.items || []).forEach(item => {
                const row = crearFilaItemComp(item.producto_id, item.cantidad, item.precio_unitario);
                compItemsContainer.appendChild(row);
            });
            if (compItemsContainer.children.length === 0) agregarFilaItemComp();
        } else {
            modalCompTitle.textContent = 'Nuevo comprobante';
            editCompId.value = '';
            compForm.reset();
            compItemsContainer.innerHTML = '';
            compFecha.value = new Date().toISOString().split('T')[0];
            compEstado.value = 'emitido';
            agregarFilaItemComp();
        }
        modalCompOverlay.classList.add('open');
        actualizarTotalCompModal();
    }

    function cerrarModalComprobante() {
        modalCompOverlay.classList.remove('open');
        compForm.reset();
        editCompId.value = '';
        compItemsContainer.innerHTML = '';
    }

    function crearFilaItemComp(productoId = '', cantidad = 1, precio = '') {
        const template = document.getElementById('compItemTemplate');
        const row = template.cloneNode(true);
        row.style.display = 'flex';
        row.id = '';
        const select = row.querySelector('.comp-producto');
        populateProductSelect(select);
        if (productoId) select.value = productoId;
        const cantidadInput = row.querySelector('.comp-cantidad');
        cantidadInput.value = cantidad;
        const precioInput = row.querySelector('.comp-precio');
        if (precio) precioInput.value = precio;
        else if (productoId) {
            const p = productos.find(pr => pr.id === parseInt(productoId));
            if (p) precioInput.value = p.precio;
        }
        const updateRow = () => {
            const cant = parseFloat(cantidadInput.value) || 0;
            const prec = parseFloat(precioInput.value) || 0;
            row.querySelector('.item-subtotal').textContent = formatCurrency(cant * prec);
            actualizarTotalCompModal();
        };
        select.addEventListener('change', function () {
            const prodId = parseInt(this.value);
            if (prodId) {
                const p = productos.find(pr => pr.id === prodId);
                if (p) precioInput.value = p.precio;
            }
            updateRow();
        });
        cantidadInput.addEventListener('input', updateRow);
        precioInput.addEventListener('input', updateRow);
        row.querySelector('.item-remove').addEventListener('click', function () {
            if (compItemsContainer.children.length > 1) {
                row.remove();
                actualizarTotalCompModal();
            } else {
                alert('Debe haber al menos un producto.');
            }
        });
        setTimeout(updateRow, 50);
        return row;
    }

    function agregarFilaItemComp() {
        const row = crearFilaItemComp();
        compItemsContainer.appendChild(row);
        actualizarTotalCompModal();
    }

    function actualizarTotalCompModal() {
        let total = 0;
        document.querySelectorAll('#compItemsContainer .item-row').forEach(row => {
            const cant = parseFloat(row.querySelector('.comp-cantidad').value) || 0;
            const prec = parseFloat(row.querySelector('.comp-precio').value) || 0;
            total += cant * prec;
        });
        totalCompModal.textContent = formatCurrency(total);
    }

    compForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const tipo = compTipo.value;
        const numero = compNumero.value.trim();
        const cliente_id = parseInt(compCliente.value);
        const fecha = compFecha.value;
        const estado = compEstado.value;
        const items = [];
        document.querySelectorAll('#compItemsContainer .item-row').forEach(row => {
            const producto_id = parseInt(row.querySelector('.comp-producto').value) || 0;
            const cantidad = parseFloat(row.querySelector('.comp-cantidad').value) || 0;
            const precio_unitario = parseFloat(row.querySelector('.comp-precio').value) || 0;
            if (producto_id > 0 && cantidad > 0 && precio_unitario >= 0) {
                items.push({ producto_id, cantidad, precio_unitario });
            }
        });
        if (!tipo || !numero || !cliente_id || !fecha || items.length === 0) {
            alert('Completa todos los campos y agrega al menos un producto.');
            return;
        }
        const data = { tipo, numero, cliente_id, fecha, estado, items };
        const editId = parseInt(editCompId.value);
        if (editId) {
            await updateComprobante(editId, data);
        } else {
            await createComprobante(data);
        }
        cerrarModalComprobante();
        loadComprobantes();
    });

    // ============================================
    // VER DETALLE (Pedido / Cotización / Comprobante)
    // ============================================
    async function verDetallePedido(id) {
        const pedido = await obtenerPedido(id);
        if (!pedido) { alert('No se pudo obtener el pedido'); return; }
        mostrarDetalle('Pedido', pedido, 'pedido');
    }

    async function verDetalleCotizacion(id) {
        const cotizacion = await obtenerCotizacion(id);
        if (!cotizacion) { alert('No se pudo obtener la cotización'); return; }
        mostrarDetalle('Cotización', cotizacion, 'cotizacion');
    }

    async function verDetalleComprobante(id) {
        const comprobante = await obtenerComprobante(id);
        if (!comprobante) { alert('No se pudo obtener el comprobante'); return; }
        mostrarDetalle('Comprobante', comprobante, 'comprobante');
    }

    function mostrarDetalle(tipo, data, tipoKey) {
        const modal = document.getElementById('modalDetalleOverlay');
        document.getElementById('modalDetalleTitle').textContent = `Detalle de ${tipo} #${data.id}`;
        document.getElementById('detalleId').textContent = data.id;
        document.getElementById('detalleTipo').textContent = tipo;
        document.getElementById('detalleCliente').textContent = getClienteNombre(data.cliente_id);
        document.getElementById('detalleFecha').textContent = data.fecha;
        const total = calcularTotal(data.items || []);
        document.getElementById('detalleTotal').textContent = formatCurrency(total);
        document.getElementById('detalleEstado').textContent = data.estado;

        // Productos
        const tbody = document.getElementById('detalleItemsBody');
        tbody.innerHTML = '';
        (data.items || []).forEach(item => {
            const tr = document.createElement('tr');
            const prodNombre = getProductoNombre(item.producto_id);
            const subtotal = item.cantidad * item.precio_unitario;
            tr.innerHTML = `
                <td>${prodNombre}</td>
                <td>${item.cantidad}</td>
                <td>${formatCurrency(item.precio_unitario)}</td>
                <td>${formatCurrency(subtotal)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Botón aprobar (solo para cotizaciones pendientes)
        const aprobarBtn = document.getElementById('detalleAprobarBtn');
        if (tipoKey === 'cotizacion' && data.estado === 'pendiente') {
            aprobarBtn.style.display = 'inline-flex';
            aprobarBtn.dataset.id = data.id;
            aprobarBtn.onclick = function () {
                if (confirm('¿Aprobar cotización #' + data.id + '?')) {
                    actualizarEstadoCotizacion(data.id, 'aprobada');
                    cerrarDetalle();
                }
            };
        } else {
            aprobarBtn.style.display = 'none';
        }

        modal.classList.add('open');
    }

    function cerrarDetalle() {
        document.getElementById('modalDetalleOverlay').classList.remove('open');
    }

    // Eventos del modal de detalle
    document.getElementById('modalDetalleClose').addEventListener('click', cerrarDetalle);
    document.getElementById('modalDetalleCancel').addEventListener('click', cerrarDetalle);
    document.getElementById('modalDetalleOverlay').addEventListener('click', function(e) {
        if (e.target === this) cerrarDetalle();
    });

    // ============================================
    // Eventos de filtros y búsqueda
    // ============================================
    function applyPedidoFilters() {
        filtrosPedido.search = searchInput.value;
        filtrosPedido.status = statusFilter.value;
        filtrosPedido.cliente = clientFilter.value;
        renderPedidos();
    }

    function resetPedidoFilters() {
        searchInput.value = '';
        statusFilter.value = '';
        clientFilter.value = '';
        filtrosPedido = { search: '', status: '', cliente: '' };
        renderPedidos();
    }

    function applyCotizacionFilters() {
        filtrosCot.estado = cotStatusFilter.value;
        filtrosCot.cliente = cotClientFilter.value;
        renderCotizaciones();
    }

    function resetCotizacionFilters() {
        cotStatusFilter.value = '';
        cotClientFilter.value = '';
        filtrosCot = { estado: '', cliente: '' };
        renderCotizaciones();
    }

    function applyComprobanteFilters() {
        filtrosComp.tipo = compTipoFilter.value;
        filtrosComp.estado = compEstadoFilter.value;
        renderComprobantes();
    }

    function resetComprobanteFilters() {
        compTipoFilter.value = '';
        compEstadoFilter.value = '';
        filtrosComp = { tipo: '', estado: '' };
        renderComprobantes();
    }

    // ============================================
    // Configuración de Tabs
    // ============================================
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const target = this.dataset.tab;
                document.getElementById('tab-' + target).classList.add('active');

                // Cambiar comportamiento del botón "Nuevo"
                const openAddBtn = document.getElementById('openAddModal');
                if (target === 'pedidos') {
                    openAddBtn.textContent = 'Nuevo pedido';
                    openAddBtn.onclick = () => abrirModalPedido();
                } else if (target === 'cotizaciones') {
                    openAddBtn.textContent = 'Nueva cotización';
                    openAddBtn.onclick = () => abrirModalCotizacion();
                } else if (target === 'comprobantes') {
                    openAddBtn.textContent = 'Nuevo comprobante';
                    openAddBtn.onclick = () => abrirModalComprobante();
                }
            });
        });
        // Inicializar tab activo (pedidos)
        const activeTab = document.querySelector('.tab-btn.active') || document.querySelector('.tab-btn[data-tab="pedidos"]');
        if (activeTab) activeTab.click();
    }

    // ============================================
    // Eventos comunes (sidebar, perfil, notificaciones, logout)
    // ============================================
    function setupCommon() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });

        const profileBtn = document.getElementById('profileBtn');
        const dropdownMenu = document.getElementById('dropdownMenu');
        profileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
        document.addEventListener('click', function (e) {
            if (!dropdownMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                dropdownMenu.classList.remove('open');
            }
        });

        document.getElementById('notifBtn').addEventListener('click', function () {
            const badge = this.querySelector('.notif-badge');
            if (badge) badge.style.display = 'none';
            alert('📬 Notificaciones marcadas como leídas.');
        });

        const logoutBtns = [
            document.getElementById('logoutBtn'),
            document.getElementById('logoutDropdown')
        ];
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (confirm('¿Cerrar sesión?')) {
                        logout();
                    }
                });
            }
        });
    }

    // ============================================
    // Eventos de los modales (cierres)
    // ============================================
    function setupModalEventos() {
        // Pedido
        if (modalClose) modalClose.addEventListener('click', cerrarModalPedido);
        if (modalCancel) modalCancel.addEventListener('click', cerrarModalPedido);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalPedido();
            });
        }
        if (addItemBtn) addItemBtn.addEventListener('click', agregarFilaItemPedido);

        // Cotización
        if (modalCotClose) modalCotClose.addEventListener('click', cerrarModalCotizacion);
        if (modalCotCancel) modalCotCancel.addEventListener('click', cerrarModalCotizacion);
        if (modalCotOverlay) {
            modalCotOverlay.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalCotizacion();
            });
        }
        if (addCotItemBtn) addCotItemBtn.addEventListener('click', agregarFilaItemCot);

        // Comprobante
        if (modalCompClose) modalCompClose.addEventListener('click', cerrarModalComprobante);
        if (modalCompCancel) modalCompCancel.addEventListener('click', cerrarModalComprobante);
        if (modalCompOverlay) {
            modalCompOverlay.addEventListener('click', function (e) {
                if (e.target === this) cerrarModalComprobante();
            });
        }
        if (addCompItemBtn) addCompItemBtn.addEventListener('click', agregarFilaItemComp);
    }

    // ============================================
    // INICIALIZACIÓN DE FILTROS Y BÚSQUEDA
    // ============================================
    if (applyFilters) applyFilters.addEventListener('click', applyPedidoFilters);
    if (resetFilters) resetFilters.addEventListener('click', resetPedidoFilters);
    if (searchInput) searchInput.addEventListener('input', applyPedidoFilters);

    if (applyCotFilters) applyCotFilters.addEventListener('click', applyCotizacionFilters);
    if (resetCotFilters) resetCotFilters.addEventListener('click', resetCotizacionFilters);

    if (applyCompFilters) applyCompFilters.addEventListener('click', applyComprobanteFilters);
    if (resetCompFilters) resetCompFilters.addEventListener('click', resetComprobanteFilters);

    // ============================================
    // EXPORTACIÓN A CSV Y PDF
    // ============================================
    function exportarVentas() {
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) {
            alert('Selecciona una pestaña (Pedidos, Cotizaciones o Comprobantes).');
            return;
        }
        const tab = activeTab.dataset.tab;
        let tbody, headers, filename;

        if (tab === 'pedidos') {
            tbody = document.getElementById('pedidoTableBody');
            headers = ['ID', 'Cliente', 'Fecha', 'Total', 'Estado'];
            filename = 'pedidos';
        } else if (tab === 'cotizaciones') {
            tbody = document.getElementById('cotizacionTableBody');
            headers = ['ID', 'Cliente', 'Fecha', 'Total', 'Estado'];
            filename = 'cotizaciones';
        } else if (tab === 'comprobantes') {
            tbody = document.getElementById('comprobanteTableBody');
            headers = ['ID', 'Número', 'Tipo', 'Cliente', 'Fecha', 'Total', 'Estado'];
            filename = 'comprobantes';
        } else {
            alert('Pestaña no soportada para exportación.');
            return;
        }

        const rows = tbody.querySelectorAll('tr');
        const data = [];
        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = {};
                cells.forEach((cell, index) => {
                    rowData[headers[index] || 'col' + index] = cell.textContent.trim();
                });
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            alert('No hay datos para exportar en esta pestaña.');
            return;
        }

        // CSV
        const csv = convertToCSV(data, headers);
        downloadFile(csv, filename + '.csv', 'text/csv;charset=utf-8;');

        // PDF
        generatePDF(data, headers, filename);
    }

    // Funciones auxiliares de exportación
    function convertToCSV(data, headers) {
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            const values = headers.map(h => {
                let val = row[h] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += values.join(',') + '\n';
        });
        return csv;
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob(['\uFEFF' + content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function generatePDF(data, headers, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text('Reporte de ' + filename.charAt(0).toUpperCase() + filename.slice(1), 14, 22);
        doc.setFontSize(10);
        doc.text('Fecha: ' + new Date().toLocaleDateString(), 14, 30);

        const tableData = data.map(row => headers.map(h => row[h] || ''));
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [26, 42, 58] }
        });

        doc.save(filename + '.pdf');
    }

    // Asignar evento al botón Exportar
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarVentas);
    }

    // ============================================
    // INICIO
    // ============================================
    setupCommon();
    setupTabs();
    setupModalEventos();

    // Cargar datos comunes y luego los específicos
    loadCommonData().then(() => {
        loadPedidos();
        loadCotizaciones();
        loadComprobantes();
    });

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    console.log('✅ Módulo de Ventas cargado correctamente.');
});