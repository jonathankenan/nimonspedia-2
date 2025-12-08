<?php

$servername = "db";
$username = "user";
$password = "password";
$database = "nimonspedia";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}


