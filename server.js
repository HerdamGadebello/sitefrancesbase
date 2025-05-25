const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Upload: manter nome original
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `./uploads/${req.params.type}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Usuários
const users = [
  { username: 'hermesdamiaobello', password: 'Aletei4f!los', role: 'professor' },
  { username: 'dommanuel', password: 'dommanuel', role: 'aluno' }
];

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, role: user.role, token: 'valid-token-' + Date.now() });
  } else {
    res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }
});

// Upload
app.post('/upload/:type', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({
    success: true,
    file: {
      name: req.file.originalname,
      url: `/uploads/${req.params.type}/${req.file.originalname}`,
      downloadUrl: `/download/${req.params.type}/${req.file.originalname}`
    }
  });
});

// Listagem
app.get('/materiais/:type', (req, res) => {
  const dir = path.join(__dirname, 'uploads', req.params.type);
  try {
    if (!fs.existsSync(dir)) return res.json([]);
    const files = fs.readdirSync(dir).map(file => ({
      name: file,
      url: `/uploads/${req.params.type}/${file}`,
      downloadUrl: `/download/${req.params.type}/${file}`
    }));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Download
app.get('/download/:type/:file', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.type, req.params.file);
  res.download(filePath);
});

// Renomear
app.post('/rename/:type', (req, res) => {
  const { oldName, newName } = req.body;
  const dir = path.join(__dirname, 'uploads', req.params.type);
  const oldPath = path.join(dir, oldName);
  const newPath = path.join(dir, newName);

  if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  fs.rename(oldPath, newPath, err => {
    if (err) return res.status(500).json({ error: 'Erro ao renomear arquivo' });
    res.json({ success: true });
  });
});

// Excluir
app.delete('/delete/:type/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.type, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  fs.unlink(filePath, err => {
    if (err) return res.status(500).json({ error: 'Erro ao excluir arquivo' });
    res.json({ success: true });
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
