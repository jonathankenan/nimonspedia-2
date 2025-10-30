<?php
namespace App\Utils;

class ImageHandler {
    public static function ensureImagePath(?string $path, string $default = '/assets/images/default.png'): string {
        if (empty($path)) return $default;
        $absPath = $_SERVER['DOCUMENT_ROOT'] . $path;
        return file_exists($absPath) ? $path : $default;
    }
}
