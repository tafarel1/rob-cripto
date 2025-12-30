# RoboCrypto Launcher

O **RoboCrypto Launcher** é uma ferramenta de inicialização automática para o projeto RoboCrypto. Ele gerencia o backend, frontend e outros serviços necessários, garantindo uma inicialização ordenada e monitorada.

## Funcionalidades

- **Inicialização Automática**: Inicia Backend e Frontend com um comando.
- **Gestão de Dependências**: Verifica versões do Node.js.
- **Gestão de Portas**: Verifica se as portas (3001, 5173) estão livres antes de iniciar.
- **Logs Centralizados**: Armazena logs de todos os serviços em `launcher/logs/`.
- **Cross-Platform**: Funciona em Windows, Linux e macOS.

## Instalação (Setup)

Para configurar o ambiente e criar atalhos:

### Windows
Execute o arquivo:
`launcher\scripts\setup.bat`

Isso irá:
1. Instalar dependências (npm install) no root, backend e frontend.
2. Criar um atalho "RoboCrypto Launcher" na sua Área de Trabalho.

### Linux/macOS
Execute no terminal:
```bash
chmod +x launcher/scripts/setup.sh
./launcher/scripts/setup.sh
```

## Uso

### Windows
- Clique no atalho **RoboCrypto Launcher** na Área de Trabalho.
- Ou execute `launcher\scripts\start.bat`.

### Linux/macOS
Execute:
```bash
chmod +x launcher/scripts/start.sh
./launcher/scripts/start.sh
```

## Configuração

O comportamento do launcher pode ser ajustado em `launcher/config/settings.json`.

```json
{
  "services": [
    {
      "name": "backend",
      "port": 3001,
      "command": "npm start"
    },
    ...
  ]
}
```

## Logs

Os logs de execução são salvos em `launcher/logs/`:
- `backend.log`
- `frontend.log`
