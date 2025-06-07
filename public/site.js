document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginSection = document.getElementById('login-section');
  const contentSection = document.getElementById('content-section');
  const uploadSection = document.getElementById('upload-section');
  const alunoSection = document.getElementById('aluno-section');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginMessage = document.getElementById('login-message');

  // Verificar se o usuário está logado
  const role = localStorage.getItem('role');
  if (role) {
    showSection(role);
  }

  // Evento de login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      localStorage.setItem('role', data.role);
      showSection(data.role);
    } catch (err) {
      loginMessage.textContent = 'Erro: ' + err.message;
      loginMessage.className = 'error';
    }
  });

  // Mostrar seção com base no papel
  function showSection(role) {
    loginSection.style.display = 'none';
    if (role === 'professor') {
      uploadSection.style.display = 'block';
      alunoSection.style.display = 'block';
      renderUploadAreas();
      loadFiles('aulas', 'aulas-list');
      loadFiles('exercicios', 'exercicios-list');
      loadFiles('anexos', 'anexos-list');
    } else {
      alunoSection.style.display = 'block';
      loadAlunoFiles('aulas', 'aluno-aulas-list');
      loadAlunoFiles('exercicios', 'aluno-exercicios-list');
      loadAlunoFiles('anexos', 'aluno-anexos-list');
    }
  }

  // Renderizar áreas de upload
  function renderUploadAreas() {
    document.getElementById('aulas-upload').innerHTML = renderUploadArea('aulas', 'Aulas', '.pdf,.doc,.docx,.ppt,.pptx');
    document.getElementById('exercicios-upload').innerHTML = renderUploadArea('exercicios', 'Exercícios', '.pdf,.doc,.docx,.ppt,.pptx,.html,.mp3,.mp4,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.zip');
    document.getElementById('anexos-upload').innerHTML = renderUploadArea('anexos', 'Anexos', '.pdf,.pptx,.mp3,.mp4,.jpg,.jpeg,.png');
    setupFileUploadListeners('aulas');
    setupFileUploadListeners('exercicios');
    setupFileUploadListeners('anexos');
  }

  // Criar área de upload
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

  // Configurar listeners para upload
  function setupFileUploadListeners(type) {
    const input = document.getElementById(`${type}-file`);
    const status = document.getElementById(`${type}-upload-status`);
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      status.textContent = file ? file.name : 'Nenhum arquivo selecionado';
      status.className = file ? 'upload-status has-file' : 'upload-status';
    });
  }

  // Fazer upload de arquivo
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

  // Carregar arquivos (professor)
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

  // Carregar arquivos (aluno)
  async function loadAlunoFiles(type, elementId) {
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
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err);
    }
  }

  // Renomear arquivo
  async function renameFile(type, oldName) {
    const newName = prompt('Novo nome do arquivo:', oldName);
    if (!newName || newName === oldName) return;
    try {
      const res = await fetch(`/rename/${type}/${oldName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      loadFiles(type, `${type}-list`);
    } catch (err) {
      alert('Erro ao renomear: ' + err.message);
    }
  }

  // Excluir arquivo
  async function deleteFile(type, filename) {
    if (!confirm(`Tem certeza que deseja excluir ${filename}?`)) return;
    try {
      const res = await fetch(`/delete/${type}/${filename}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      loadFiles(type, `${type}-list`);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  }

  // Expor funções globais
  window.uploadFile = uploadFile;
  window.renameFile = renameFile;
  window.deleteFile = deleteFile;
});
