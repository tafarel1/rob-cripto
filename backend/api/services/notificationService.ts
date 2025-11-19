import TelegramBot from 'node-telegram-bot-api';
import nodemailer from 'nodemailer';
import { TradePosition, TradingSignal, SMCAnalysis } from '../../shared/types';

export class NotificationService {
  private telegramBot: TelegramBot | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;
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
  async notifyRiskAlert(alertType: string, details: any): Promise<void> {
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
🎯 Take Profit: ${signal.takeProfit.map(tp => `$${tp.toFixed(4)}`).join(', ')}
📈 Confiança: ${(signal.confidence * 100).toFixed(1)}%
📝 Razão: ${signal.reason}
⏰ Timeframe: ${signal.timeframe}

📈 *Análise SMC:*
🔍 Zonas de Liquidez: ${analysis.liquidityZones.length}
🧱 Order Blocks: ${analysis.orderBlocks.length}
⚡ Fair Value Gaps: ${analysis.fairValueGaps.length}
📊 Estruturas de Mercado: ${analysis.marketStructures.length}

⚠️ *Importante:* Este é um sinal automático. Sempre faça sua própria análise!
    `;
  }

  /**
   * Formata mensagem de posição
   */
  private formatPositionMessage(position: TradePosition, signal: TradingSignal): string {
    const emoji = position.type === 'LONG' ? '🟢' : '🔴';
    const direction = position.type === 'LONG' ? 'LONG' : 'SHORT';
    
    return `
🤖 *ROBO CRIPTO - POSIÇÃO ABERTA*

${emoji} *${direction}*

📊 *Detalhes da Posição:*
📋 ID: \`${position.id}\`
💰 Símbolo: ${position.symbol}
💵 Preço de Entrada: $${position.entryPrice.toFixed(4)}
📦 Quantidade: ${position.quantity.toFixed(6)}
🛑 Stop Loss: $${position.stopLoss.toFixed(4)}
🎯 Take Profit: ${position.takeProfit.map(tp => `$${tp.toFixed(4)}`).join(', ')}
📈 Confiança do Sinal: ${(signal.confidence * 100).toFixed(1)}%
📝 Razão: ${signal.reason}

⏰ Posição aberta em: ${new Date(position.openTime).toLocaleString('pt-BR')}

📊 *Gestão de Risco:*
💡 Risk/Reward: 1:${((position.takeProfit[0] - position.entryPrice) / Math.abs(position.entryPrice - position.stopLoss)).toFixed(2)}
    `;
  }

  /**
   * Formata mensagem de posição fechada
   */
  private formatPositionClosedMessage(position: TradePosition, reason: string): string {
    const emoji = position.realizedPnl && position.realizedPnl > 0 ? '✅' : '❌';
    const result = position.realizedPnl && position.realizedPnl > 0 ? 'GANHO' : 'PERDA';
    const pnl = position.realizedPnl || 0;
    
    return `
🤖 *ROBO CRIPTO - POSIÇÃO FECHADA*

${emoji} *${result}*

📊 *Detalhes do Fechamento:*
📋 ID: \`${position.id}\`
💰 Símbolo: ${position.symbol}
💵 Preço de Entrada: $${position.entryPrice.toFixed(4)}
💰 PnL Realizado: $${pnl.toFixed(4)}
📊 Resultado: ${pnl > 0 ? '+' : ''}${((pnl / (position.entryPrice * position.quantity)) * 100).toFixed(2)}%
📝 Motivo: ${reason}

⏰ Posição fechada em: ${position.closeTime ? new Date(position.closeTime).toLocaleString('pt-BR') : 'N/A'}

📈 *Estatísticas:*
📊 Total de trades: ${position.fees > 0 ? 'Com taxas' : 'Sem taxas'}
💰 Taxas pagas: $${position.fees.toFixed(4)}
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
  private formatRiskAlertMessage(alertType: string, details: any): string {
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
  private formatDailyPerformanceMessage(stats: any): string {
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
   * Envia mensagem via Telegram
   */
  private async sendTelegramMessage(message: string): Promise<void> {
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

    const toEmail = process.env.EMAIL_USER;
    if (!toEmail) {
      return;
    }

    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
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
        await this.emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
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
}