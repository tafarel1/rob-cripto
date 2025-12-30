import { nativeBridge } from './services/nativeBridge.js';

async function test() {
  console.log('Testing Native Bridge...');
  
  try {
    // Test 1: Ping
    console.log('Sending ping...');
    const pong = await nativeBridge.executeQuantTask('ping', {});
    console.log('Ping result:', pong);

    // Test 2: Sharpe Ratio
    console.log('Calculating Sharpe...');
    const returns = [0.01, -0.005, 0.02, 0.015, -0.01, 0.005];
    const sharpe = await nativeBridge.executeQuantTask('calculate_sharpe', { returns });
    console.log('Sharpe Ratio:', sharpe);

    // Test 3: Monte Carlo
    console.log('Running Monte Carlo...');
    const mc = await nativeBridge.executeQuantTask('monte_carlo', {
      initial_price: 50000,
      mu: 0.05,
      sigma: 0.2
    });
    console.log('Monte Carlo Result:', mc);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    nativeBridge.shutdown();
  }
}

test();
