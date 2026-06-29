const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { initializeDb } = require('./config/db');
const profileRoutes = require('./routes/profiles');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use('/api/profiles', profileRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await initializeDb();
    app.listen(port, () => {
      console.log(`Server started on http://localhost:${port}`);
      console.log('Database schema initialized.');
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    if (error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

start();
