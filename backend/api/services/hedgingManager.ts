import { TradePosition, HedgingConfig } from '../../../shared/types.js';
import { ExchangeService } from './exchangeService.js';
import { NotificationService } from './notificationService.js';

export class HedgingManager {
    private config: HedgingConfig;
    private exchangeService: ExchangeService;
    private notificationService: NotificationService;
    private currentHedgePosition: number = 0; // Quantity of hedge symbol held (Negative = Short)
    private lastCheck: number = 0;

    constructor(
        config: HedgingConfig, 
        exchangeService: ExchangeService,
        notificationService: NotificationService
    ) {
        this.config = config;
        this.exchangeService = exchangeService;
        this.notificationService = notificationService;
    }

    public async evaluatePortfolio(positions: TradePosition[]): Promise<void> {
        if (!this.config.enabled) return;
        
        const now = Date.now();
        if (now - this.lastCheck < this.config.checkInterval) return;
        this.lastCheck = now;

        try {
            // 1. Calculate Portfolio Delta (excluding hedge)
            let portfolioDeltaUSD = 0;
            
            // Simplified assumption: 1:1 correlation with USD value
            for (const pos of positions) {
                // Fetch current price for pos.symbol
                // In a real high-freq system, we'd use a local cache or ticker stream
                const ticker = await this.exchangeService.getTicker('binance', pos.symbol);
                const value = ticker.last * pos.quantity;
                portfolioDeltaUSD += pos.type === 'LONG' ? value : -value;
            }

            // 2. Get Hedge Symbol Price
            const hedgeTicker = await this.exchangeService.getTicker(this.config.hedgeExchange, this.config.hedgeSymbol);
            const hedgePrice = hedgeTicker.last;

            // 3. Calculate Total Delta including current hedge
            const hedgeDeltaUSD = this.currentHedgePosition * hedgePrice;
            const totalDeltaUSD = portfolioDeltaUSD + hedgeDeltaUSD;

            console.log(`[Hedging] Portfolio Delta: $${portfolioDeltaUSD.toFixed(2)} | Hedge Delta: $${hedgeDeltaUSD.toFixed(2)} | Total: $${totalDeltaUSD.toFixed(2)}`);

            // 4. Check Thresholds
            const deviation = totalDeltaUSD - this.config.targetDelta;
            
            // Use dynamic or static maxDeltaExposure
            const currentMaxExposure = this.dynamicMaxExposure ?? this.config.maxDeltaExposure;

            if (Math.abs(deviation) > currentMaxExposure) {
                console.log(`[Hedging] Deviation ${deviation.toFixed(2)} exceeds limit ${currentMaxExposure} (Vol Adjusted: ${this.dynamicMaxExposure !== undefined})`);
                await this.rebalanceHedge(deviation, hedgePrice, totalDeltaUSD);
            }

        } catch (error) {
            console.error('[Hedging] Error evaluating portfolio:', error);
            await this.notificationService.notifyError(error as Error, 'Hedging Evaluation');
        }
    }

    private dynamicMaxExposure?: number;

    public updateMarketVolatility(volatility: number) {
        // Base exposure from config
        const baseExposure = this.config.maxDeltaExposure;

        // Logic: 
        // Vol < 0.5% -> 100% of base exposure
        // Vol 0.5% - 1.0% -> 50% of base exposure
        // Vol > 1.0% -> 20% of base exposure (Aggressive Hedging)
        
        if (volatility > 0.01) {
            this.dynamicMaxExposure = baseExposure * 0.2;
            console.log(`[Hedging] ⚠️ High Volatility (${(volatility*100).toFixed(2)}%). Tightening Delta Limit to $${this.dynamicMaxExposure}`);
        } else if (volatility > 0.005) {
            this.dynamicMaxExposure = baseExposure * 0.5;
            console.log(`[Hedging] ⚠️ Medium Volatility (${(volatility*100).toFixed(2)}%). Reducing Delta Limit to $${this.dynamicMaxExposure}`);
        } else {
            this.dynamicMaxExposure = undefined; // Reset to default
        }
    }

    private async rebalanceHedge(deviationUSD: number, hedgePrice: number, currentTotalDelta: number) {
        // deviationUSD = TotalDelta - TargetDelta
        // If deviation > 0, we are too Long. We need to reduce delta (Short Hedge).
        // If deviation < 0, we are too Short. We need to increase delta (Buy Hedge).
        
        // We want to remove the deviation.
        // Change in Hedge Delta USD should be -deviationUSD.
        // Change in Hedge Qty = -deviationUSD / hedgePrice.
        
        const quantityChange = -deviationUSD / hedgePrice;
        const action = quantityChange > 0 ? 'buy' : 'sell';
        const quantity = Math.abs(quantityChange);
        
        // Min trade size check (approx $15 for safety)
        if (quantity * hedgePrice < 15) {
            console.log(`[Hedging] Rebalance required but size too small ($${(quantity * hedgePrice).toFixed(2)})`);
            return;
        }

        console.log(`[Hedging] Rebalancing: ${action.toUpperCase()} ${quantity.toFixed(4)} ${this.config.hedgeSymbol}`);
        
        try {
            // Execute Market Order
            const order = await this.exchangeService.createMarketOrder(
                this.config.hedgeExchange,
                this.config.hedgeSymbol,
                action,
                quantity
            );
            
            // Update local state
            // In a real system, we'd verify the fill quantity from 'order'
            const filledQty = order.filledQuantity || quantity; // Fallback if filled not reported immediately
            
            if (action === 'buy') {
                this.currentHedgePosition += filledQty;
            } else {
                this.currentHedgePosition -= filledQty;
            }
            
            const newTotalDelta = currentTotalDelta + (action === 'buy' ? filledQty * hedgePrice : -filledQty * hedgePrice);

            const msg = `🛡️ HEDGE EXECUTED\nAction: ${action.toUpperCase()} ${filledQty.toFixed(4)} ${this.config.hedgeSymbol}\nReason: Delta Deviation $${deviationUSD.toFixed(2)}\nNew Delta Exposure: $${newTotalDelta.toFixed(2)}`;
            await this.notificationService.sendTelegramMessage(msg); 

        } catch (error) {
            console.error('[Hedging] Execution failed:', error);
            await this.notificationService.notifyError(error as Error, 'Hedge Execution');
        }
    }

    public getCurrentHedgePosition(): number {
        return this.currentHedgePosition;
    }
}
