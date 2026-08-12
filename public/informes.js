// ============================================
// public/informes.js - Módulo de Informes (v2 con correcciones)
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const user = getCurrentUser();
    if (user && user.permisos && !user.permisos.includes('informes')) {
        alert('Acceso denegado: no tienes permiso para Informes.');
        window.location.href = 'index.html';
        return;
    }

    let pedidos = [];
    let proveedores = [];
    let clientes = [];
    let compras = [];
    let comprobantes = [];

    // --- Elementos DOM ---
    const ventasTbody = document.getElementById('ventasTableBody');
    const comprasTbody = document.getElementById('comprasTableBody');
    const pleTbody = document.getElementById('pleTableBody');
    const retencionesTbody = document.getElementById('retencionesTableBody');

    const totalVentasSpan = document.getElementById('totalVentas');
    const totalComprasSpan = document.getElementById('totalCompras');
    const totalIGVSpan = document.getElementById('totalIGV');
    const totalComprobantesSpan = document.getElementById('totalComprobantes');

    const ventasCount = document.getElementById('ventasCount');
    const comprasCount = document.getElementById('comprasCount');
    const pleCount = document.getElementById('pleCount');
    const retencionesCount = document.getElementById('retencionesCount');

    const periodoInput = document.getElementById('periodo');
    const tipoComprobanteSelect = document.getElementById('tipoComprobante');
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const searchInput = document.getElementById('globalSearch');
    const downloadBtn = document.getElementById('downloadBtn');
    const generateBtn = document.getElementById('generateBtn');

    // --- Establecer fecha actual por defecto ---
    const hoy = new Date();
    const mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
    periodoInput.value = mesActual;

    // --- Funciones auxiliares ---
    function formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return '$ ' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getClienteNombre(id) {
        if (!clientes || clientes.length === 0) return 'Cliente ' + id;
        const c = clientes.find(cl => cl.id === id);
        return c ? c.nombre : 'Cliente ' + id;
    }

    function getProveedorNombre(id) {
        const p = proveedores.find(pr => pr.id === id);
        return p ? p.nombre : 'Proveedor ' + id;
    }

    function getRUCCliente(id) {
        const c = clientes.find(cl => cl.id === id);
        return c ? c.ruc || 'Sin RUC' : 'Sin RUC';
    }

    function filterByPeriod(data, periodo) {
        if (!periodo) return data;
        const [year, month] = periodo.split('-');
        return data.filter(item => {
            if (!item.fecha) return false;
            const d = new Date(item.fecha);
            return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
        });
    }

    function filterBySearch(data, term) {
        if (!term.trim()) return data;
        const search = term.trim().toLowerCase();
        return data.filter(item => JSON.stringify(item).toLowerCase().includes(search));
    }

    // --- Cargar datos ---
    async function loadData() {
        try {
            const [pedidosData, proveedoresData, clientesData, comprasData, comprobantesData] = await Promise.all([
                getPedidos(),
                getProveedores(),
                getClientes(),
                getCompras(),
                getComprobantes()
            ]);

            pedidos = Array.isArray(pedidosData) ? pedidosData : [];
            proveedores = Array.isArray(proveedoresData) ? proveedoresData : [];
            clientes = Array.isArray(clientesData) ? clientesData : [];
            compras = Array.isArray(comprasData) ? comprasData : [];
            comprobantes = Array.isArray(comprobantesData) ? comprobantesData : [];

            console.log('📊 Datos cargados:');
            console.log('Pedidos:', pedidos.length);
            console.log('Proveedores:', proveedores.length);
            console.log('Clientes:', clientes.length);
            console.log('Compras:', compras.length);
            console.log('Comprobantes:', comprobantes.length);

            renderAll();
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            alert('Error al cargar los datos. Revisa la consola.');
        }
    }

    // --- Renderizar ventas ---
    function renderVentas() {
        let data = pedidos.filter(p => p.estado === 'completado' || p.estado === 'enviado');
        const periodo = periodoInput.value;
        const search = searchInput.value;
        data = filterByPeriod(data, periodo);
        data = filterBySearch(data, search);

        ventasTbody.innerHTML = '';
        if (data.length === 0) {
            ventasTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay ventas registradas</td></tr>`;
            ventasCount.textContent = 0;
            return;
        }

        data.forEach(p => {
            const total = (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
            const igv = total * 0.18;
            const subtotal = total - igv;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Factura #${p.id}</td>
                <td>${getClienteNombre(p.cliente_id)}</td>
                <td>${p.fecha}</td>
                <td>${formatCurrency(subtotal)}</td>
                <td>${formatCurrency(igv)}</td>
                <td>${formatCurrency(total)}</td>
            `;
            ventasTbody.appendChild(tr);
        });
        ventasCount.textContent = data.length;
    }

    // --- Renderizar compras (con datos reales) ---
    function renderCompras() {
        let data = [...compras];
        const periodo = periodoInput.value;
        const search = searchInput.value;
        data = filterByPeriod(data, periodo);
        data = filterBySearch(data, search);

        comprasTbody.innerHTML = '';
        if (data.length === 0) {
            comprasTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay compras registradas</td></tr>`;
            comprasCount.textContent = 0;
            return;
        }

        data.forEach(c => {
            const proveedorNombre = getProveedorNombre(c.proveedor_id);
            const total = parseFloat(c.total) || 0;
            const igv = total * 0.18;
            const subtotal = total - igv;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Compra #${c.id}</td>
                <td>${proveedorNombre}</td>
                <td>${c.fecha}</td>
                <td>${formatCurrency(subtotal)}</td>
                <td>${formatCurrency(igv)}</td>
                <td>${formatCurrency(total)}</td>
            `;
            comprasTbody.appendChild(tr);
        });
        comprasCount.textContent = data.length;
    }

    // --- Renderizar PLE (con comprobantes reales) ---
    function renderPLE() {
        let data = [...comprobantes];
        const periodo = periodoInput.value;
        const search = searchInput.value;
        data = filterByPeriod(data, periodo);
        data = filterBySearch(data, search);

        pleTbody.innerHTML = '';
        if (data.length === 0) {
            pleTbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No hay comprobantes registrados</td></tr>`;
            pleCount.textContent = 0;
            return;
        }

        data.forEach((c, index) => {
            const clienteNombre = getClienteNombre(c.cliente_id);
            const ruc = getRUCCliente(c.cliente_id);
            const tipoMap = { factura: 'Factura', boleta: 'Boleta', nota_credito: 'Nota Crédito', nota_debito: 'Nota Débito' };
            const tipo = tipoMap[c.tipo] || c.tipo;
            let serie = '', numero = '';
            if (c.numero) {
                const parts = c.numero.split('-');
                if (parts.length === 2) {
                    serie = parts[0];
                    numero = parts[1];
                } else {
                    numero = c.numero;
                }
            }
            const total = parseFloat(c.total) || 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${tipo}</td>
                <td>${serie}</td>
                <td>${numero}</td>
                <td>${c.fecha}</td>
                <td>${clienteNombre}</td>
                <td>${ruc}</td>
                <td>${formatCurrency(total)}</td>
                <td>${formatCurrency(total * 0.18)}</td>
            `;
            pleTbody.appendChild(tr);
        });
        pleCount.textContent = data.length;
    }

    // --- Renderizar retenciones (simulación) ---
    function renderRetenciones() {
        // Si no hay proveedores, mostrar mensaje
        if (proveedores.length === 0) {
            retencionesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay proveedores para simular retenciones</td></tr>`;
            retencionesCount.textContent = 0;
            return;
        }

        let data = proveedores.map(p => ({
            comprobante: 'Factura ' + p.id,
            proveedor: p.nombre,
            fecha: new Date().toISOString().split('T')[0],
            base: 1000,
            porcentaje: 10,
            monto: 100
        }));
        const periodo = periodoInput.value;
        const search = searchInput.value;
        data = filterByPeriod(data, periodo);
        data = filterBySearch(data, search);

        retencionesTbody.innerHTML = '';
        if (data.length === 0) {
            retencionesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No hay retenciones simuladas en este período</td></tr>`;
            retencionesCount.textContent = 0;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.comprobante}</td>
                <td>${item.proveedor}</td>
                <td>${item.fecha}</td>
                <td>${formatCurrency(item.base)}</td>
                <td>${item.porcentaje}%</td>
                <td>${formatCurrency(item.monto)}</td>
            `;
            retencionesTbody.appendChild(tr);
        });
        retencionesCount.textContent = data.length;
    }

    // --- Actualizar resúmenes ---
    function updateSummaryCards() {
        // Ventas
        const totalVentas = pedidos.filter(p => p.estado === 'completado')
            .reduce((acc, p) => acc + (p.items || []).reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0), 0);
        totalVentasSpan.textContent = formatCurrency(totalVentas);

        // Compras
        const totalCompras = compras.reduce((acc, c) => acc + (parseFloat(c.total) || 0), 0);
        totalComprasSpan.textContent = formatCurrency(totalCompras);

        // IGV (18% sobre ventas)
        totalIGVSpan.textContent = formatCurrency(totalVentas * 0.18);

        // Comprobantes
        totalComprobantesSpan.textContent = comprobantes.length;
    }

    // --- Renderizar todo ---
    function renderAll() {
        renderVentas();
        renderCompras();
        renderPLE();
        renderRetenciones();
        updateSummaryCards();
    }

    // --- Exportar a CSV ---
    function exportToCSV(rows, headers, filename) {
        if (!rows || rows.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += headers.map(h => {
                let val = row[h] !== undefined ? row[h] : '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            }).join(',') + '\n';
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename + '.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // --- Eventos de exportación ---
    downloadBtn.addEventListener('click', function () {
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return;
        const tab = activeTab.dataset.tab;
        let rows = [], headers = [], filename = '';

        if (tab === 'ventas') {
            ventasTbody.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length > 1) {
                    rows.push({
                        comprobante: cells[0].textContent,
                        cliente: cells[1].textContent,
                        fecha: cells[2].textContent,
                        subtotal: cells[3].textContent,
                        igv: cells[4].textContent,
                        total: cells[5].textContent
                    });
                }
            });
            headers = ['comprobante', 'cliente', 'fecha', 'subtotal', 'igv', 'total'];
            filename = 'ventas';
        } else if (tab === 'compras') {
            comprasTbody.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length > 1) {
                    rows.push({
                        comprobante: cells[0].textContent,
                        proveedor: cells[1].textContent,
                        fecha: cells[2].textContent,
                        subtotal: cells[3].textContent,
                        igv: cells[4].textContent,
                        total: cells[5].textContent
                    });
                }
            });
            headers = ['comprobante', 'proveedor', 'fecha', 'subtotal', 'igv', 'total'];
            filename = 'compras';
        } else if (tab === 'ple') {
            pleTbody.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length > 1) {
                    rows.push({
                        correlativo: cells[0].textContent,
                        tipo: cells[1].textContent,
                        serie: cells[2].textContent,
                        numero: cells[3].textContent,
                        fecha: cells[4].textContent,
                        cliente: cells[5].textContent,
                        ruc: cells[6].textContent,
                        total: cells[7].textContent,
                        igv: cells[8].textContent
                    });
                }
            });
            headers = ['correlativo', 'tipo', 'serie', 'numero', 'fecha', 'cliente', 'ruc', 'total', 'igv'];
            filename = 'PLE';
        } else if (tab === 'retenciones') {
            retencionesTbody.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length > 1) {
                    rows.push({
                        comprobante: cells[0].textContent,
                        proveedor: cells[1].textContent,
                        fecha: cells[2].textContent,
                        base: cells[3].textContent,
                        porcentaje: cells[4].textContent,
                        monto: cells[5].textContent
                    });
                }
            });
            headers = ['comprobante', 'proveedor', 'fecha', 'base', 'porcentaje', 'monto'];
            filename = 'retenciones';
        }

        if (rows.length === 0) {
            alert('No hay datos para exportar en esta pestaña.');
            return;
        }
        exportToCSV(rows, headers, filename);
    });

    generateBtn.addEventListener('click', function () {
        renderAll();
        alert('✅ Reporte actualizado con los filtros actuales.');
    });

    // --- Filtros ---
    function applyFilters() {
        renderAll();
    }

    function resetFilters() {
        periodoInput.value = mesActual;
        tipoComprobanteSelect.value = '';
        searchInput.value = '';
        renderAll();
    }

    // --- Tabs ---
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
            });
        });
    }

    // --- Eventos comunes ---
    function setupCommon() {
        // ... (código igual al que tenías, sin cambios) ...
        // Incluye sidebar, perfil, notificaciones, logout
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

    // --- Inicialización ---
    setupCommon();
    setupTabs();
    applyBtn.addEventListener('click', applyFilters);
    resetBtn.addEventListener('click', resetFilters);
    searchInput.addEventListener('input', applyFilters);

    // Mostrar nombre de usuario en el topbar
    const userData = getCurrentUser();
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userData && userData.nombre && userNameSpan) {
        userNameSpan.textContent = userData.nombre.toUpperCase();
    }

    loadData();
});