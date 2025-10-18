<?php
function paginate($conn, $query, $perPage = 10, $page = 1) {
    $offset = ($page - 1) * $perPage;
    $result = $conn->query("$query LIMIT $offset, $perPage");
    return $result;
}

function getTotalPages($conn, $table, $perPage = 10) {
    $res = $conn->query("SELECT COUNT(*) as total FROM $table");
    $row = $res->fetch_assoc();
    return ceil($row['total'] / $perPage);
}
?>
