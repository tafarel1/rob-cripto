# Guia de Solução de Problemas (Troubleshooting)

Este guia ajuda a resolver problemas comuns com o RoboCrypto Launcher.

## 🛠️ Diagnóstico Automático

O Launcher inclui uma ferramenta de diagnóstico que verifica automaticamente o ambiente.

### Windows
1. Navegue até a pasta `launcher\scripts`.
2. Clique duas vezes em `diagnose.bat`.
3. Um relatório será gerado na pasta `launcher\logs`.

### Linux / macOS
1. Abra o terminal na pasta do projeto.
2. Execute:
   ```bash
   ./launcher/scripts/diagnose.sh
   ```
3. O relatório será salvo em `launcher/logs`.

---

## ⚠️ Erros Comuns e Soluções

### 1. "Node.js is not installed or not in PATH"
**Causa:** O Node.js não está instalado ou o sistema não consegue encontrá-lo.
**Solução:**
- O Launcher agora tenta baixar o Node.js automaticamente.
- Se falhar, verifique sua conexão com a internet.
- Você pode baixar e instalar manualmente o Node.js (versão 18 ou superior) do site oficial: [nodejs.org](https://nodejs.org/).

### 2. "Port 9999 is already in use"
**Causa:** Outro programa (ou uma instância antiga do Launcher) está usando a porta do painel.
**Solução:**
- Feche outras janelas do terminal que possam estar rodando o Launcher.
- Reinicie o computador se o problema persistir.
- **Avançado:** Edite `launcher/config/settings.json` e mude a porta.

### 3. "Permission denied" ou "EACCES"
**Causa:** O Launcher não tem permissão para escrever arquivos ou criar pastas.
**Solução:**
- **Windows:** Execute o `start.bat` como Administrador.
- **Linux/macOS:** Verifique as permissões da pasta com `chmod +w`.

### 4. Falha na Instalação de Dependências
**Causa:** Falha na conexão com o registro NPM ou firewall bloqueando.
**Solução:**
- Verifique sua internet.
- Tente rodar `npm install` manualmente na pasta raiz.

---

## 📞 Suporte Técnico

Se os problemas persistirem, envie o arquivo de log gerado pelo diagnóstico para o suporte.

**Arquivos de Log:**
- `launcher/logs/diagnostics_*.txt`
- `launcher/logs/Launcher.log`
