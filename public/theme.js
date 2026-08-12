// ============================================
// public/theme.js - Gestor de temas global (claro/oscuro/sistema)
// ============================================

(function() {
    'use strict';

    // Función para obtener el tema preferido del sistema
    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
    }

    // Función para aplicar el tema
    function applyTheme(theme) {
        // Si es 'sistema', detectar automáticamente
        let temaAplicado = theme;
        if (theme === 'sistema') {
            temaAplicado = getSystemTheme();
        }

        // Remover todas las clases de tema
        document.documentElement.classList.remove('theme-claro', 'theme-oscuro');

        // Agregar la clase correspondiente
        if (temaAplicado === 'oscuro') {
            document.documentElement.classList.add('theme-oscuro');
            document.body.classList.add('theme-oscuro');
            document.body.classList.remove('theme-claro');
        } else {
            document.documentElement.classList.add('theme-claro');
            document.body.classList.add('theme-claro');
            document.body.classList.remove('theme-oscuro');
        }

        // Guardar en localStorage
        localStorage.setItem('tema', theme);

        // Actualizar los radio buttons si existen en la página actual
        document.querySelectorAll('input[name="tema"]').forEach(el => {
            el.checked = (el.value === theme);
        });
    }

    // Función para cargar el tema guardado
    function loadTheme() {
        let temaGuardado = localStorage.getItem('tema');
        if (!temaGuardado) {
            temaGuardado = 'sistema'; // por defecto
            localStorage.setItem('tema', temaGuardado);
        }
        applyTheme(temaGuardado);
    }

    // Escuchar cambios en el sistema (si está en modo 'sistema')
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        const temaGuardado = localStorage.getItem('tema');
        if (temaGuardado === 'sistema') {
            applyTheme('sistema');
        }
    });

    // Exponer funciones globalmente
    window.themeManager = {
        applyTheme: applyTheme,
        loadTheme: loadTheme,
        getSystemTheme: getSystemTheme
    };

    // Cargar tema al inicio
    document.addEventListener('DOMContentLoaded', function() {
        loadTheme();
        console.log('✅ Tema cargado:', localStorage.getItem('tema'));
    });

})();