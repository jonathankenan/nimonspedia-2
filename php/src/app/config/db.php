<?php
$host = 'db';            
$user = 'user';
$pass = 'password';
$db   = 'nimonspedia';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
  die("<p style='color:red'> Database connection failed: " . $conn->connect_error . "</p>");
} else {
  echo "<p style='color:green'> Connected to database successfully!</p>";
}
?>
