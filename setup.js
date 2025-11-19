#!/usr/bin/env node

/**
 * Script de configuração inicial do Robô Cripto
 * Este script ajuda a configurar as variáveis de ambiente e testar as conexões
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🤖 Configurador do Robô Cripto');
console.log('=====================================\n');

// Verificar se .env existe
const envPath = join(process.cwd(), '.env');
if (!existsSync(envPath)) {
  console.log('❌ Arquivo .env não encontrado!');
  console.log('📝 Criando arquivo .env com configurações padrão...\n');
  
  const defaultEnv = `# Configurações do Servidor
NODE_ENV=development
PORT=3001

# Configurações de Exchange (BINANCE)
BINANCE_API_KEY=sua_api_key_aqui
BINANCE_SECRET=sua_secret_aqui

# Configurações de Exchange (BYBIT)
BYBIT_API_KEY=sua_api_key_aqui
BYBIT_SECRET=sua_secret_aqui

# Configurações do Banco de Dados (Supabase)
SUPABASE_URL=sua_supabase_url_aqui
SUPABASE_ANON_KEY=sua_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Configurações de Notificação
TELEGRAM_BOT_TOKEN=seu_telegram_bot_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui

EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app_aqui

# Configurações de Redis
REDIS_URL=redis://localhost:6379

# Configurações de Segurança
JWT_SECRET=sua_chave_secreta_jwt_super_segura_aqui
JWT_EXPIRES_IN=7d

# Configurações de Trading
DEFAULT_RISK_PER_TRADE=2
DEFAULT_MAX_DAILY_LOSS=5
DEFAULT_MAX_POSITIONS=5
DEFAULT_RISK_REWARD_RATIO=2

# Configurações de Logs
LOG_LEVEL=info
LOG_FILE=logs/trading.log
`;

  writeFileSync(envPath, defaultEnv);
  console.log('✅ Arquivo .env criado com sucesso!\n');
} else {
  console.log('✅ Arquivo .env já existe\n');
}

// Menu de configuração
console.log('Escolha uma opção para configurar:');
console.log('1. Configurar API da Binance');
console.log('2. Configurar API da Bybit');
console.log('3. Configurar Supabase');
console.log('4. Configurar Telegram');
console.log('5. Configurar Email');
console.log('6. Configurar todos');
console.log('7. Sair\n');

// Funções de configuração
function configureBinance() {
  console.log('📊 Configuração da Binance API');
  console.log('============================\n');
  console.log('Para obter suas chaves API da Binance:');
  console.log('1. Acesse: https://www.binance.com/en/my/settings/api-management');
  console.log('2. Crie uma nova API key');
  console.log('3. Ative as permissões de leitura e trading');
  console.log('4. Configure restrições de IP (recomendado)\n');
  console.log('⚠️  NUNCA compartilhe suas chaves API!\n');
}

function configureBybit() {
  console.log('📊 Configuração da Bybit API');
  console.log('============================\n');
  console.log('Para obter suas chaves API da Bybit:');
  console.log('1. Acesse: https://www.bybit.com/app/user/api-management');
  console.log('2. Crie uma nova API key');
  console.log('3. Ative as permissões de leitura e trading');
  console.log('4. Configure restrições de IP (recomendado)\n');
  console.log('⚠️  NUNCA compartilhe suas chaves API!\n');
}

function configureSupabase() {
  console.log('🗄️  Configuração do Supabase');
  console.log('============================\n');
  console.log('Para configurar o Supabase:');
  console.log('1. Acesse: https://supabase.com');
  console.log('2. Crie um novo projeto');
  console.log('3. Vá para Settings > API');
  console.log('4. Copie a URL e as chaves (anon e service_role)\n');
  console.log('📋 Chaves necessárias:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY\n');
}

function configureTelegram() {
  console.log('📱 Configuração do Telegram');
  console.log('=========================\n');
  console.log('Para configurar notificações via Telegram:');
  console.log('1. Crie um bot com @BotFather');
  console.log('2. Obtenha o token do bot');
  console.log('3. Inicie uma conversa com seu bot');
  console.log('4. Obtenha seu chat ID com @userinfobot\n');
  console.log('📋 Informações necessárias:');
  console.log('- TELEGRAM_BOT_TOKEN');
  console.log('- TELEGRAM_CHAT_ID\n');
}

function configureEmail() {
  console.log('📧 Configuração de Email');
  console.log('========================\n');
  console.log('Para configurar notificações por email:');
  console.log('1. Use Gmail ou outro serviço SMTP');
  console.log('2. Para Gmail, ative a autenticação de 2 fatores');
  console.log('3. Crie uma senha de app específica');
  console.log('4. Configure as credenciais no .env\n');
  console.log('📋 Configurações necessárias:');
  console.log('- EMAIL_SMTP_HOST (smtp.gmail.com)');
  console.log('- EMAIL_SMTP_PORT (587)');
  console.log('- EMAIL_USER (seu email)');
  console.log('- EMAIL_PASSWORD (senha de app)\n');
}

function showNextSteps() {
  console.log('🎯 Próximos Passos');
  console.log('=================\n');
  console.log('1. Configure suas chaves API no arquivo .env');
  console.log('2. Execute: npm run dev');
  console.log('3. Acesse: http://localhost:5173');
  console.log('4. Vá para o dashboard e configure suas estratégias\n');
  console.log('📚 Documentação:');
  console.log('- Leia o README.md para mais informações');
  console.log('- Configure suas estratégias no dashboard');
  console.log('- Teste em modo demo antes de usar dinheiro real\n');
  console.log('⚠️  Importante:');
  console.log('- Sempre teste em modo demo primeiro');
  console.log('- Nunca invista mais do que pode perder');
  console.log('- Monitore suas operações regularmente\n');
}

// Simular entrada do usuário (em produção, use readline)
const option = process.argv[2] || '6';

switch (option) {
  case '1':
    configureBinance();
    break;
  case '2':
    configureBybit();
    break;
  case '3':
    configureSupabase();
    break;
  case '4':
    configureTelegram();
    break;
  case '5':
    configureEmail();
    break;
  case '6':
    console.log('🔧 Configurando todos os serviços...\n');
    configureBinance();
    console.log('\n' + '='.repeat(50) + '\n');
    configureBybit();
    console.log('\n' + '='.repeat(50) + '\n');
    configureSupabase();
    console.log('\n' + '='.repeat(50) + '\n');
    configureTelegram();
    console.log('\n' + '='.repeat(50) + '\n');
    configureEmail();
    console.log('\n' + '='.repeat(50) + '\n');
    showNextSteps();
    break;
  case '7':
    console.log('👋 Até logo!');
    process.exit(0);
    break;
  default:
    console.log('❌ Opção inválida. Use: node setup.js [1-7]');
    console.log('📋 Executando configuração completa...\n');
    configureBinance();
    configureBybit();
    configureSupabase();
    configureTelegram();
    configureEmail();
    showNextSteps();
}

console.log('\n✅ Configuração concluída!');
console.log('🚀 Execute "npm run dev" para iniciar o sistema.\n');