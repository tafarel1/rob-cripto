// No import needed for Node 18+

async function checkTimeframes() {
  const symbol = 'BTC/USDT';
  const timeframes = ['1d', '1w'];

  for (const tf of timeframes) {
    try {
      console.log(`\nTesting timeframe: ${tf}`);
      const url = `http://localhost:3000/api/analysis/smc?symbol=${encodeURIComponent(symbol)}&timeframe=${tf}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ Error fetching ${tf}: ${response.status} ${response.statusText}`);
        continue;
      }

      const json = await response.json();
      if (json.success && json.data && json.data.candles && json.data.candles.length > 0) {
        console.log(`✅ Success for ${tf}`);
        console.log(`   Count: ${json.data.candles.length}`);
        console.log(`   Sample:`, json.data.candles[0]);
      } else {
        console.error(`❌ Failed/Empty data for ${tf}`);
        console.log('   Response:', JSON.stringify(json).substring(0, 200));
      }
    } catch (err) {
      console.error(`❌ Exception for ${tf}:`, err.message);
    }
  }
}

checkTimeframes();
