const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar Multer para salvar temporariamente
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './Uploads/temp';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

// Filtro de formatos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    aulas: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    exercicios: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/html',
      'audio/mpeg',
      'video/mp4',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/zip'
    ],
    anexos: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'audio/mpeg',
      'video/mp4',
      'image/jpeg',
      'image/png'
    ]
  };
  if (allowedTypes[req.params.type].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de arquivo não permitido para ${req.params.type}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

// Simulação de banco de dados de usuários
const users = {
  hermesdamiaobello: { password: 'Aletei4f!los', role: 'professor' },
  aluno: { password: 'aluno123', role: 'aluno' }
};

// Middleware para autenticação
function authMiddleware(req, res, next) {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  req.user = user;
  next();
}

// Endpoint de Login
app.post('/login', authMiddleware, (req, res) => {
  res.json({ success: true, role: req.user.role });
});

// Endpoint de Upload
app.post('/upload/:type', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `uploads/${req.params.type}`,
      resource_type: 'auto'
    });
    fs.unlinkSync(req.file.path); // Remove arquivo temporário
    res.json({
      success: true,
      file: {
        name: req.file.originalname,
        url: result.secure_url,
        downloadUrl: result.secure_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar para o Cloudinary: ' + error.message });
  }
});

// Endpoint de Listagem de Arquivos
app.get('/materiais/:type', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      resource_type: 'auto',
      prefix: `uploads/${req.params.type}`,
      max_results: 100
    });
    const files = result.resources.map(resource => ({
      name: resource.public_id.split('/').pop() + '.' + resource.format,
      url: resource.secure_url,
      downloadUrl: resource.secure_url
    }));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos: ' + error.message });
  }
});

// Endpoint de Renomeação
app.put('/rename/:type/:filename', express.json(), async (req, res) => {
  const { newName } = req.body;
  const oldPublicId = `uploads/${req.params.type}/${req.params.filename.split('.')[0]}`;
  try {
    // Renomear no Cloudinary
    await cloudinary.uploader.rename(oldPublicId, `uploads/${req.params.type}/${newName.split('.')[0]}`, {
      resource_type: 'auto'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao renomear arquivo: ' + err.message });
  }
});

// Endpoint de Exclusão
app.delete('/delete/:type/:filename', async (req, res) => {
  try {
    const publicId = `uploads/${req.params.type}/${req.params.filename.split('.')[0]}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir arquivo: ' + err.message });
  }
});

// Endpoint de Download
app.get('/download/:type/:filename', async (req, res) => {
  try {
    const publicId = `uploads/${req.params.type}/${req.params.filename.split('.')[0]}`;
    const result = await cloudinary.api.resource(publicId, { resource_type: 'auto' });
    res.redirect(result.secure_url);
  } catch (err) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Iniciar o servidor
app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor rodando');
});F
