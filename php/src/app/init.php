<?php
spl_autoload_register(function ($class) {
    // Ubah \ ke / dan sesuaikan base dir
    $baseDir = __DIR__;
    $file = $baseDir . '/' . str_replace('\\', '/', $class) . '.php';
    
    // Jika file ada, require langsung
    if (file_exists($file)) {
        require $file;
        return;
    }

    // Alternatif: scan folder untuk case-insensitive
    $parts = explode('\\', $class);
    $dir = $baseDir;
    foreach ($parts as $part) {
        $found = false;
        foreach (scandir($dir) as $f) {
            if (strcasecmp($f, $part.'.php') === 0) {
                $dir = $dir . '/' . $f;
                $found = true;
                break;
            }
        }
        if (!$found) return; // abort jika tidak ditemukan
    }
    require $dir;
});
