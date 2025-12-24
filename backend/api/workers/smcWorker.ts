import { parentPort, workerData } from 'worker_threads';
import { SMCAnalyzer } from '../services/smcAnalyzer';
import { MarketData } from '../../../shared/types';

// Check if running as a worker
if (parentPort) {
  parentPort.on('message', (message: { type: string; data: MarketData[]; config: any }) => {
    if (message.type === 'ANALYZE') {
      try {
        const analyzer = new SMCAnalyzer(message.config);
        const analysis = analyzer.analyze(message.data);
        parentPort?.postMessage({ success: true, analysis });
      } catch (error: any) {
        parentPort?.postMessage({ success: false, error: error.message });
      }
    }
  });
}
