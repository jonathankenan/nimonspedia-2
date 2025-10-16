<form action="/registerAuth.php" method="POST">
  <label>Nama:</label><br>
  <input type="text" name="name" required><br><br>

  <label>Email:</label><br>
  <input type="email" name="email" required><br><br>

  <label>Password:</label><br>
  <input type="password" name="password" required><br><br>

  <label>Role:</label><br>
  <select name="role">
    <option value="BUYER">BUYER</option>
    <option value="SELLER">SELLER</option>
  </select><br><br>

  <label>Alamat:</label><br>
  <textarea name="address" required></textarea><br><br>

  <button type="submit">Register</button>
</form>
