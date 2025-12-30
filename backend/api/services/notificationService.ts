import TelegramBot from 'node-telegram-bot-api';
import nodemailer from 'nodemailer';
import { TradePosition, TradingSignal, SMCAnalysis } from '../../../shared/types.js';

export class NotificationService {
  private telegramBot: { sendMessage: (chatId: string, message: string, options?: { parse_mode?: string; disable_web_page_preview?: boolean }) => Promise<unknown> } | null = null;
  private emailTransporter: { sendMail: (options: { from: string; to: string; subject: string; text?: string; html?: string }) => Promise<unknown> } | null = null;
  private telegramChatId: string | null = null;

  constructor() {
    this.initializeServices();
  }

  /**
   * Inicializa serviços de notificação
   */
  private initializeServices(): void {
    // Inicializar Telegram
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID || null;

    if (telegramToken && this.telegramChatId) {
      try {
        this.telegramBot = new TelegramBot(telegramToken, { polling: false });
        console.log('Serviço de Telegram inicializado');
      } catch (error) {
        console.error('Erro ao inicializar Telegram:', error);
      }
    }

    // Inicializar Email
    const emailConfig = {
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    if (emailConfig.host && emailConfig.auth.user && emailConfig.auth.pass) {
      try {
        this.emailTransporter = nodemailer.createTransport(emailConfig);
        console.log('Serviço de Email inicializado');
      } catch (error) {
        console.error('Erro ao inicializar Email:', error);
      }
    }
  }

  /**
   * Envia notificação de novo sinal
   */
  async notifySignal(signal: TradingSignal, analysis: SMCAnalysis): Promise<void> {
    const message = this.formatSignalMessage(signal, analysis);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail('Novo Sinal de Trading', message)
    ]);
  }

  /**
   * Envia notificação de nova posição
   */
  async notifyPosition(position: TradePosition, signal: TradingSignal): Promise<void> {
    const message = this.formatPositionMessage(position, signal);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail('Nova Posição Aberta', message)
    ]);
  }

  /**
   * Envia notificação de posição fechada
   */
  async notifyPositionClosed(position: TradePosition, reason: string): Promise<void> {
    const message = this.formatPositionClosedMessage(position, reason);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail('Posição Fechada', message)
    ]);
  }

  /**
   * Envia notificação de erro crítico
   */
  async notifyError(error: Error, context?: string): Promise<void> {
    const message = this.formatErrorMessage(error, context);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail('Erro Crítico no Sistema', message)
    ]);
  }

  /**
   * Envia notificação de alerta de risco
   */
  async notifyRiskAlert(alertType: string, details: Record<string, unknown>): Promise<void> {
    const message = this.formatRiskAlertMessage(alertType, details);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail(`Alerta de Risco: ${alertType}`, message)
    ]);
  }

  /**
   * Envia notificação de performance diária
   */
  async notifyDailyPerformance(stats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    sharpeRatio: number;
  }): Promise<void> {
    const message = this.formatDailyPerformanceMessage(stats);
    
    await Promise.all([
      this.sendTelegramMessage(message),
      this.sendEmail('Relatório Diário de Performance', message)
    ]);
  }

  /**
   * Formata mensagem de sinal
   */
  private formatSignalMessage(signal: TradingSignal, analysis: SMCAnalysis): string {
    const emoji = signal.type === 'BUY' ? '🟢' : '🔴';
    const direction = signal.type === 'BUY' ? 'COMPRA' : 'VENDA';
    
    return `
🤖 *ROBO CRIPTO - SINAL DE TRADING*

${emoji} *${direction}*

📊 *Detalhes do Sinal:*
💰 Preço de Entrada: $${signal.entryPrice.toFixed(4)}
🛑 Stop Loss: $${signal.stopLoss.toFixed(4)}
🎯 Take Profit: ${signal.takeProfit.map((tp: number) => `$${tp.toFixed(4)}`).join(', ')}
📈 Confiança: ${(signal.confidence * 100).toFixed(1)}%
📝 Razão: ${signal.reason}
⏰ Timeframe: ${signal.timeframe}

📈 *Análise SMC:*
🔍 Zonas de Liquidez: ${analysis.liquidityZones.length}
🧱 Order Blocks: ${analysis.orderBlocks.length}
⚡ Fair Value Gaps: ${analysis.fairValueGaps.length}
📊 Estruturas de Mercado: ${analysis.marketStructures?.length || 0}

⚠️ *Importante:* Este é um sinal automático. Sempre faça sua própria análise!
    `;
  }

  private formatPositionMessage(position: TradePosition, signal: TradingSignal): string {
    const emoji = position.type === 'LONG' ? '🟢' : '🔴';
    const direction = position.type === 'LONG' ? 'COMPRA (LONG)' : 'VENDA (SHORT)';
    
    return `
🤖 *ROBO CRIPTO - NOVA POSIÇÃO*

${emoji} *${direction}*

📊 *Detalhes da Posição:*
🆔 ID: ${position.id.substring(0, 8)}
💰 Entrada: $${position.entryPrice.toFixed(4)}
📦 Quantidade: ${position.quantity}
🛑 Stop Loss: $${position.stopLoss.toFixed(4)}
🎯 Take Profit: ${position.takeProfit.map(tp => `$${tp.toFixed(4)}`).join(', ')}
⏰ Posição aberta em: ${new Date(position.openTime || Date.now()).toLocaleString('pt-BR')}

📈 *Sinal Original:*
🔍 Confiança: ${(signal.confidence * 100).toFixed(1)}%
📝 Razão: ${signal.reason}
    `;
  }

  /**
   * Formata mensagem de posição fechada
   */
  private formatPositionClosedMessage(position: TradePosition, reason: string): string {
    const pnl = position.pnl || 0;
    const emoji = pnl >= 0 ? '✅' : '❌';
    const pnlPercent = ((pnl / (position.entryPrice * position.quantity)) * 100);
    
    return `
🤖 *ROBO CRIPTO - POSIÇÃO FECHADA*

${emoji} *Resultado: $${pnl.toFixed(4)} (${pnlPercent.toFixed(2)}%)*

📊 *Detalhes do Fechamento:*
🆔 ID: ${position.id.substring(0, 8)}
💰 Preço Saída: $${(position.closePrice || 0).toFixed(4)}
📦 Quantidade: ${position.quantity}
📝 Motivo: ${reason}
⏰ Tempo de Trade: ${this.formatDuration((position.closeTime || Date.now()) - (position.openTime || Date.now()))}

💰 *Custos:*
📊 Total de trades: ${(position.fees || 0) > 0 ? 'Com taxas' : 'Sem taxas'}
💰 Taxas pagas: $${(position.fees || 0).toFixed(4)}

⚖️ *Saldo Atualizado:*
...
    `;
  }

  /**
   * Formata mensagem de erro
   */
  private formatErrorMessage(error: Error, context?: string): string {
    return `
🚨 *ERRO CRÍTICO NO SISTEMA*

📋 *Detalhes do Erro:*
${context ? `📝 Contexto: ${context}\n` : ''}❌ Mensagem: ${error.message}
📁 Stack: \`${error.stack?.substring(0, 500)}\`

⏰ Horário: ${new Date().toLocaleString('pt-BR')}

⚠️ *Ação Requerida:* Verifique o sistema imediatamente!
    `;
  }

  /**
   * Formata mensagem de alerta de risco
   */
  private formatRiskAlertMessage(alertType: string, details: Record<string, unknown>): string {
    return `
⚠️ *ALERTA DE RISCO*

🚨 *Tipo de Alerta:* ${alertType}

📊 *Detalhes:*
${JSON.stringify(details, null, 2)}

⏰ Horário: ${new Date().toLocaleString('pt-BR')}

🔴 *Ação Sugerida:* Revise suas posições e ajuste o risco se necessário.
    `;
  }

  /**
   * Formata mensagem de performance diária
   */
  private formatDailyPerformanceMessage(stats: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalPnl: number;
    sharpeRatio: number;
  }): string {
    const emoji = stats.totalPnl >= 0 ? '✅' : '❌';
    
    return `
📊 *RELATÓRIO DIÁRIO DE PERFORMANCE*

${emoji} *Resultado do Dia:*

📈 *Estatísticas:*
📊 Total de Trades: ${stats.totalTrades}
✅ Trades Vencedores: ${stats.winningTrades}
❌ Trades Perdedores: ${stats.losingTrades}
📈 Taxa de Acerto: ${(stats.winRate * 100).toFixed(1)}%
💰 PnL Total: $${stats.totalPnl.toFixed(4)}
📊 Sharpe Ratio: ${stats.sharpeRatio.toFixed(3)}

📅 Data: ${new Date().toLocaleDateString('pt-BR')}

🤖 *Robo Cripto - Sistema Automatizado de Trading*
    `;
  }

  /**
   * Envia mensagem genérica (alias para sendTelegramMessage)
   */
  async send(message: string): Promise<void> {
    await this.sendTelegramMessage(message);
  }

  /**
   * Envia mensagem via Telegram
   */
  public async sendTelegramMessage(message: string): Promise<void> {
    if (!this.telegramBot || !this.telegramChatId) {
      return;
    }

    try {
      await this.telegramBot.sendMessage(this.telegramChatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem Telegram:', error);
    }
  }

  /**
   * Envia email
   */
  private async sendEmail(subject: string, content: string): Promise<void> {
    if (!this.emailTransporter) {
      return;
    }

    const toEmail = process.env.EMAIL_USER ?? '';
    const fromEmail = process.env.EMAIL_USER ?? '';
    if (!toEmail || !fromEmail) {
      return;
    }

    try {
      await this.emailTransporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: `Robo Cripto - ${subject}`,
        text: content,
        html: `<pre>${content}</pre>`
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }

  /**
   * Testa serviços de notificação
   */
  async testNotifications(): Promise<{
    telegram: boolean;
    email: boolean;
  }> {
    const results = {
      telegram: false,
      email: false
    };

    // Testar Telegram
    if (this.telegramBot && this.telegramChatId) {
      try {
        await this.telegramBot.sendMessage(this.telegramChatId, '🔧 Teste de notificação Telegram - Robo Cripto');
        results.telegram = true;
      } catch (error) {
        console.error('Falha no teste Telegram:', error);
      }
    }

    // Testar Email
    if (this.emailTransporter) {
      try {
        const user = process.env.EMAIL_USER ?? '';
        if (!user) {
          return results;
        }
        await this.emailTransporter.sendMail({
          from: user,
          to: user,
          subject: 'Teste - Robo Cripto',
          text: '🔧 Teste de notificação Email - Robo Cripto'
        });
        results.email = true;
      } catch (error) {
        console.error('Falha no teste Email:', error);
      }
    }

    return results;
  }

  /**
   * Formata duração
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
