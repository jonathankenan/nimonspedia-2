<?php

function ensureJsonResponse() {
    // Start output buffering
    ob_start();
    
    // Disable error reporting to prevent HTML errors
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    
    // Set JSON content type
    header('Content-Type: application/json');
    header('X-Content-Type-Options: nosniff');
    
    // Register shutdown function to catch fatal errors
    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error !== NULL) {
            // Clear any output that might have been generated
            if (ob_get_length()) ob_clean();
            
            // Send JSON error response
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Server error occurred',
                'error' => [
                    'type' => 'fatal_error',
                    'message' => $error['message']
                ]
            ]);
        }
    });

    // Set custom error handler for warnings and notices
    set_error_handler(function($errno, $errstr, $errfile, $errline) {
        // Clear any output that might have been generated
        if (ob_get_length()) ob_clean();
        
        // Send JSON error response
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred',
            'error' => [
                'type' => 'error',
                'message' => $errstr
            ]
        ]);
        exit;
    }, E_ALL);

    // Set exception handler
    set_exception_handler(function($exception) {
        // Clear any output that might have been generated
        if (ob_get_length()) ob_clean();
        
        // Send JSON error response
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server error occurred',
            'error' => [
                'type' => 'exception',
                'message' => $exception->getMessage()
            ]
        ]);
        exit;
    });
}

function jsonResponse($data, $statusCode = 200) {
    // Clear any previous output
    if (ob_get_length()) ob_clean();
    
    // Set headers if they haven't been sent yet
    if (!headers_sent()) {
        header('Content-Type: application/json');
        header('X-Content-Type-Options: nosniff');
        http_response_code($statusCode);
    }
    
    // Ensure the response has success status
    if (is_array($data) && !isset($data['success'])) {
        $data['success'] = ($statusCode >= 200 && $statusCode < 300);
    }
    
    // Send JSON response
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}