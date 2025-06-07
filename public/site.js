let currentUser = null;

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showLoginForm(role) {
    document.getElementById('username').value = role;
    showScreen('login-form-screen');
}

function showLoginScreen() {
    showScreen('login-screen');
}

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('login-message');

    messageDiv.textContent = '';
    messageDiv.className = 'message';

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Credenciais inválidas');
        }

        currentUser = {
            username,
            role: data.role,
            token: data.token
        };

        if (data.role === 'professor') {
            loadProfessorArea();
        } else {
            loadAlunoArea();
        }

    } catch (error) {
        messageDiv.textContent = error.message;
        messageDiv.classList.add('error');
        console.error('Erro no login:', error);
    }
}

function loadProfessorArea() {
    const professorArea = document.getElementById('professor-area');
    professorArea.innerHTML = `
        <div class="header">
            <img src="/assets/LOGOOFICIAL.png" alt="Logo" class="header-logo">
            <button onclick="logout()" class="btn logout-btn">
                <i class="fas fa-sign-out-alt"></i> Sair
            </button>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="showTab('aulas', event)">
                <i class="fas fa-book"></i> Aulas
            </button>
            <button class="tab-btn" onclick="showTab('exercicios', event)">
                <i class="fas fa-running"></i> Exercícios
            </button>
            <button class="tab-btn" onclick="showTab('anexos', event)">
                <i class="fas fa-paperclip"></i> Anexos
            </button>
        </div>
        <div id="aulas" class="tab-content active">
            ${renderUploadArea('aulas', 'Material de Aula', '.pdf,.doc,.docx,.ppt,.pptx')}
            <div id="aulas-list" class="file-list"></div>
        </div>
        <div id="exercicios" class="tab-content">
            ${renderUploadArea('exercicios', 'Exercício', '.pdf,.doc,.docx,.ppt,.pptx,.html,.mp3,.mp4,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.zip')}
            <div id="exercicios-list" class="file-list"></div>
        </div>
        <div id="anexos" class="tab-content">
            ${renderUploadArea('anexos', 'Anexo', '.pdf,.pptx,.mp3,.mp4,.jpg,.jpeg,.png')}
            <div id="anexos-list" class="file-list"></div>
        </div>
    `;
    setupFileUploadListeners();
    showScreen('professor-area');
    loadFiles('aulas', 'aulas-list');
}

function renderUploadArea(type, title, accept) {
    return `
        <div class="upload-area">
            <h3><i class="fas fa-upload"></i> Enviar ${title}</h3>
            <div class="file-upload">
                <label for="${type}-file" class="file-select-btn">
                    <i class="fas fa-folder-open"></i> Selecionar Arquivo
                </label>
                <input type="file" id="${type}-file" accept="${accept}">
                <button onclick="uploadFile('${type}')" class="btn upload-btn">
                    <i class="fas fa-cloud-upload-alt"></i> Enviar
                </button>
                <div id="${type}-upload-status" class="upload-status"></div>
            </div>
        </div>
    `;
}

function loadAlunoArea() {
    const alunoArea = document.getElementById('aluno-area');
    alunoArea.innerHTML = `
        <div class="header">
            <img src="/assets/LOGOOFICIAL.png" alt="Logo" class="header-logo">
            <button onclick="logout()" class="btn logout-btn">
                <i class="fas fa-sign-out-alt"></i> Sair
            </button>
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="showAlunoTab('aulas', event)">
                <i class="fas fa-book"></i> Aulas
            </button>
            <button class="tab-btn" onclick="showAlunoTab('exercicios', event)">
                <i class="fas fa-running"></i> Exercícios
            </button>
            <button class="tab-btn" onclick="showAlunoTab('anexos', event)">
                <i class="fas fa-paperclip"></i> Anexos
            </button>
        </div>
        <div id="aluno-aulas" class="tab-content active">
            <div id="aluno-aulas-list" class="materiais-container"></div>
        </div>
        <div id="aluno-exercicios" class="tab-content">
            <div id="aluno-exercicios-list" class="materiais-container"></div>
        </div>
        <div id="aluno-anexos" class="tab-content">
            <div id="aluno-anexos-list" class="materiais-container"></div>
        </div>
    `;
    showScreen('aluno-area');
    loadAlunoFiles('aulas', 'aluno-aulas-list');
}

function setupFileUploadListeners() {
    const types = ['aulas', 'exercicios', 'anexos'];
    types.forEach(type => {
        const input = document.getElementById(`${type}-file`);
        const status = document.getElementById(`${type}-upload-status`);
        if (input && status) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                status.textContent = file ? file.name : 'Nenhum arquivo selecionado';
                status.className = file ? 'upload-status has-file' : 'upload-status';
            });
        }
    });
}

async function uploadFile(type) {
    const input = document.getElementById(`${type}-file`);
    const file = input.files[0];
    const status = document.getElementById(`${type}-upload-status`);
    if (!file) {
        status.textContent = 'Selecione um arquivo primeiro!';
        status.className = 'upload-status error';
        return;
    }

    try {
        status.textContent = 'Enviando...';
        status.className = 'upload-status uploading';
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`/upload/${type}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Erro no upload');
        status.textContent = 'Enviado com sucesso!';
        status.className = 'upload-status success';
        input.value = '';
        loadFiles(type, `${type}-list`);
    } catch (err) {
        status.textContent = 'Erro: ' + err.message;
        status.className = 'upload-status error';
    }
}

function showTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    loadFiles(tabId, `${tabId}-list`);
}

function showAlunoTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`aluno-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
    loadAlunoFiles(tabId, `aluno-${tabId}-list`);
}

async function loadFiles(type, elementId) {
    try {
        const res = await fetch(`/materiais/${type}`);
        const files = await res.json();
        const list = document.getElementById(elementId);
        list.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <i class="fas fa-file-alt fa-lg"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <div class="file-actions">
                    <a href="${file.url}" target="_blank" class="download-btn"><i class="fas fa-eye"></i></a>
                    <a href="${file.downloadUrl}" download class="download-btn"><i class="fas fa-download"></i></a>
                    <button class="rename-btn" onclick="renameFile('${type}', '${file.name}')"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteFile('${type}', '${file.name}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar arquivos:', err);
    }
}

async function loadAlunoFiles(type, elementId) {
    try {
        const res = await fetch(`/materiais/${type}`);
        const files = await res.json();
        const list = document.getElementById(elementId);
        list.innerHTML = files.map(file => `
            <div class="material-item">
                <div class="file-info">
                    <i class="fas fa-file-alt fa-lg"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <div class="file-actions">
                    <a href="${file.url}" target="_blank" class="download-btn"><i class="fas fa-eye"></i></a>
                    <a href="${file.downloadUrl}" download class="download-btn"><i class="fas fa-download"></i></a>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar arquivos do aluno:', err);
    }
}

async function deleteFile(type, filename) {
    if (!confirm(`Deseja excluir "${filename}"?`)) return;
    try {
        const res = await fetch(`/delete/${type}/${filename}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao excluir');
        loadFiles(type, `${type}-list`);
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function renameFile(type, filename) {
    const newName = prompt('Novo nome do arquivo:', filename);
    if (!newName || newName === filename) return;

    try {
        const res = await fetch(`/rename/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName: filename, newName })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao renomear');
        loadFiles(type, `${type}-list`);
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

function logout() {
    currentUser = null;
    showScreen('login-screen');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    showScreen('login-screen');
});
