const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Verbinding maken met een SQLite databasebestand ('anime_app.db')
const db = new sqlite3.Database('./anime_app.db', (err) => {
  if (err) {
    console.error('Fout bij openen database:', err.message);
  } else {
    console.log('Verbonden met de SQLite-database.');
  }
});

// Tabellen aanmaken als ze nog niet bestaan
db.serialize(() => {
  // 1. Gebruikers tabel
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT
  )`);

  // 2. Watchlist tabel
  db.run(`CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    seen BOOLEAN DEFAULT 0,
    score REAL,
    review TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

// --- AUTHENTICATIE API ROUTES ---

// Registreren
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
  
  db.run(query, [username, email, password], function(err) {
    if (err) {
      return res.status(400).json({ error: 'Gebruikersnaam of e-mailadres is al in gebruik.' });
    }
    res.json({ success: true, user: { id: this.lastID, username, email } });
  });
});

// Inloggen
app.post('/api/login', (req, res) => {
  const { identifier, password } = req.body;
  const query = `SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?`;

  db.get(query, [identifier, identifier, password], (err, row) => {
    if (err || !row) {
      return res.status(400).json({ error: 'Ongeldige inloggegevens.' });
    }
    res.json({ success: true, user: { id: row.id, username: row.username, email: row.email } });
  });
});


// --- WATCHLIST API ROUTES ---

// Ophalen van de watchlist voor een specifieke gebruiker
app.get('/api/watchlist/:userId', (req, res) => {
  const userId = req.params.userId;
  db.all(`SELECT * FROM watchlist WHERE user_id = ?`, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Anime / serie toevoegen aan de watchlist
app.post('/api/watchlist', (req, res) => {
  const { user_id, title } = req.body;
  const query = `INSERT INTO watchlist (user_id, title, seen, score, review) VALUES (?, ?, 0, NULL, '')`;
  
  db.run(query, [user_id, title], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, user_id, title, seen: false, score: null, review: '' });
  });
});

// Watchlist item bijwerken
app.put('/api/watchlist/:id', (req, res) => {
  const { id } = req.params;
  const { seen, score, review } = req.body;
  const query = `UPDATE watchlist SET seen = ?, score = ?, review = ? WHERE id = ?`;

  db.run(query, [seen ? 1 : 0, score, review, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Item verwijderen van de watchlist
app.delete('/api/watchlist/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM watchlist WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Start de server
app.listen(PORT, () => {
  console.log(`Server draait op http://localhost:${PORT}`);
});