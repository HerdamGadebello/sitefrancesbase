const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect('mongodb://localhost/portal-educacional', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['professor', 'aluno'], required: true }
});
const User = mongoose.model('User', UserSchema);

async function createUser(username, password, role) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, role });
        await user.save();
        console.log(`Usuário ${username} criado com sucesso!`);
    } catch (error) {
        console.error(`Erro ao criar usuário ${username}:`, error);
    }
}

async function main() {
    await createUser('hermesdamiaobello', 'Aletei4f!los', 'professor');
    await createUser('dommanuel', 'dommanuel', 'aluno');
    mongoose.connection.close();
}

main().catch(err => console.error('Erro:', err));