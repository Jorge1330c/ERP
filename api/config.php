<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

define('DB_FILE', __DIR__ . '/../erp.db');
define('JWT_SECRET', 'clave_secreta_super_segura_123456789');
define('JWT_EXPIRES', 28800);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}