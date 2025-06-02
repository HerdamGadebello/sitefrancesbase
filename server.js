require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conexão com MongoDB
mongoose.connect('mongodb://localhost/portal-educacional')
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Schema do Usuário
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['professor', 'aluno'], required: true }
});
const User = mongoose.model('User', UserSchema);

// Configurar Cloudinary
cloudinary.config({
    cloud_name: 'dg1wvczwx',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Testar conexão com Cloudinary
cloudinary.api.ping((error, result) => {
    if (error) {
        console.error('Erro ao conectar ao Cloudinary:', error);
    } else {
        console.log('Conexão com Cloudinary bem-sucedida:', result);
    }
});

// Configuração de upload com Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'audio/mpeg',
            'video/mp4'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas PDFs, documentos, apresentações, imagens, áudios MP3 e vídeos MP4 são permitidos'));
        }
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true, role: user.role, token: 'valid-token-' + Date.now() });
        } else {
            res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Upload com Cloudinary
app.post('/upload/:type', upload.single('file'), async (req, res) => {
    console.log('Arquivo recebido:', req.file);
    console.log('Tipo de upload:', req.params.type);
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    try {
        const result = await cloudinary.uploader.upload_stream({
            folder: `uploads/${req.params.type}`,
            resource_type: 'auto'
        }, (error, result) => {
            if (error) throw new Error(error.message || 'Erro desconhecido no upload');
            res.json({
                success: true,
                file: {
                    name: req.file.originalname,
                    url: result.secure_url,
                    downloadUrl: result.secure_url
                }
            });
        }).end(req.file.buffer);
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao fazer upload: ' + (error.message || 'Erro desconhecido') });
    }
});

// Listagem
app.get('/materiais/:type', async (req, res) => {
    console.log('Listando materiais do tipo:', req.params.type);
    try {
        const { resources } = await cloudinary.api.resources({
            resource_type: 'raw',
            prefix: `uploads/${req.params.type}`,
            max_results: 100
        });
        const files = resources.map(file => ({
            name: file.public_id.split('/').pop(),
            url: file.secure_url,
            downloadUrl: file.secure_url
        }));
        res.json(files);
    } catch (error) {
        console.error('Erro ao listar:', error);
        res.status(500).json({ error: 'Erro ao listar arquivos: ' + (error.message || 'Erro desconhecido') });
    }
});

// Download
app.get('/download/:type/:file', async (req, res) => {
    const publicId = `uploads/${req.params.type}/${req.params.file}`;
    try {
        const { secure_url } = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
        res.redirect(secure_url);
    } catch (error) {
        console.error('Erro ao baixar:', error);
        res.status(404).json({ error: 'Arquivo não encontrado' });
    }
});

// Renomear
app.post('/rename/:type', async (req, res) => {
    const { oldName, newName } = req.body;
    const oldPublicId = `uploads/${req.params.type}/${oldName}`;
    const newPublicId = `uploads/${req.params.type}/${newName}`;
    try {
        await cloudinary.uploader.rename(oldPublicId, newPublicId, { resource_type: 'raw' });
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao renomear:', error);
        res.status(500).json({ error: 'Erro ao renomear arquivo: ' + (error.message || 'Erro desconhecido') });
    }
});

// Excluir
app.delete('/delete/:type/:filename', async (req, res) => {
    const publicId = `uploads/${req.params.type}/${req.params.filename}`;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir:', error);
        res.status(500).json({ error: 'Erro ao excluir arquivo: ' + (error.message || 'Erro desconhecido') });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});