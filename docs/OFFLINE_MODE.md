# Modo Offline e Instalação Manual

O RoboCrypto Launcher foi projetado para funcionar mesmo sem acesso contínuo à internet, desde que preparado corretamente.

## 📦 Como Funciona o Modo Offline

O Launcher possui um sistema de "Node.js Portátil". Isso significa que ele pode carregar sua própria versão do Node.js dentro da pasta `launcher/tools/node`, ignorando a necessidade de instalação no sistema operacional.

### Prioridade de Execução:
1. **Node.js Portátil:** Se existir em `launcher/tools/node`, será usado preferencialmente.
2. **Node.js do Sistema:** Se não houver portátil, tenta usar o instalado no Windows/Linux.
3. **Download Automático:** Se nenhum for encontrado, o Launcher tenta baixar automaticamente (requer internet na primeira vez).

---

## 🚀 Criando um Pacote Offline (Para Distribuidores)

Se você precisa instalar o RoboCrypto em computadores sem internet, siga estes passos em uma máquina **COM** internet:

1. **Prepare o Ambiente:**
   - Certifique-se de que o projeto está rodando corretamente.
   - Execute o Launcher uma vez para garantir que todas as dependências (`node_modules`) foram baixadas.

2. **Gere o Pacote:**
   - Execute o script de empacotamento (se disponível) ou crie um arquivo ZIP contendo toda a pasta do projeto.
   - **Importante:** Certifique-se de incluir a pasta `launcher/tools/node`. Se ela estiver vazia, o computador offline precisará ter o Node.js instalado previamente.

   *Dica: Para garantir que o Node portátil esteja presente, você pode deixar o Launcher baixá-lo automaticamente na primeira execução ou copiar manualmente o executável do Node.js para `launcher/tools/node/node-vXX-win-x64/`.*

3. **Instalação no Cliente Offline:**
   - Copie o arquivo ZIP para o computador de destino (via Pen Drive, Rede, etc.).
   - Extraia em uma pasta (ex: `C:\RoboCrypto`).
   - Execute `launcher\scripts\start.bat` (Windows) ou `start.sh` (Linux).

## ⚠️ Limitações do Modo Offline

- **Atualizações:** O sistema de atualização automática (Git) não funcionará.
- **Novas Dependências:** Se o código for alterado e exigir novos módulos NPM, eles não serão baixados.
- **Multiplataforma:** A pasta `node_modules` gerada no Windows pode não funcionar no Linux e vice-versa (devido a módulos binários). Recomenda-se gerar o pacote offline no mesmo sistema operacional do destino.
