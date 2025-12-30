mod market_data;
mod smc;

use market_data::websocket_client::WebSocketClient;
use smc::calculator::SMCCalculator;
use smc::types::Candle;
use log::{info, error};
use std::env;
use tokio::io::{self, AsyncBufReadExt, BufReader};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Command {
    id: String,
    command: String,
    payload: serde_json::Value,
}

#[derive(Serialize)]
struct Response {
    id: String,
    status: String,
    result: Option<serde_json::Value>,
    message: Option<String>,
}

#[tokio::main]
async fn main() {
    // Initialize Logger (Env var controls level)
    // env_logger::init(); 
    // Disable logger to stdout to avoid messing up JSON communication
    // Ideally log to file or stderr
    
    // Using stderr for logs so stdout is clean for JSON-RPC
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .target(env_logger::Target::Stderr)
        .init();

    info!("Starting RoboCrypto Trade Core (Rust)...");

    let stdin = io::stdin();
    let reader = BufReader::new(stdin);
    let mut lines = reader.lines();

    info!("Ready to receive commands via Stdin");

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() { continue; }
        
        match serde_json::from_str::<Command>(&line) {
            Ok(cmd) => {
                let response = process_command(cmd).await;
                if let Ok(json) = serde_json::to_string(&response) {
                    println!("{}", json);
                }
            },
            Err(e) => {
                error!("Failed to parse command: {}", e);
                // Optionally send error response back if ID can be recovered, 
                // but for now just log to stderr
            }
        }
    }
}

async fn process_command(cmd: Command) -> Response {
    match cmd.command.as_str() {
        "analyze_smc" => {
            if let Ok(candles) = serde_json::from_value::<Vec<Candle>>(cmd.payload) {
                let calculator = SMCCalculator::new();
                let analysis = calculator.analyze(&candles);
                Response {
                    id: cmd.id,
                    status: "ok".to_string(),
                    result: Some(serde_json::to_value(analysis).unwrap_or_default()),
                    message: None,
                }
            } else {
                Response {
                    id: cmd.id,
                    status: "error".to_string(),
                    result: None,
                    message: Some("Invalid payload: expected Vec<Candle>".to_string()),
                }
            }
        },
        "start_market_stream" => {
            // Start WS client in background? 
            // For now, let's just acknowledge. 
            // Real implementation would spawn a task.
            tokio::spawn(async move {
                let binance_ws_url = "wss://stream.binance.com:9443";
                let mut ws_client = WebSocketClient::new(binance_ws_url);
                ws_client.add_subscription("btcusdt@aggTrade");
                ws_client.run().await;
            });
            
            Response {
                id: cmd.id,
                status: "ok".to_string(),
                result: Some(serde_json::json!({"message": "Market stream started"})),
                message: None,
            }
        },
        _ => Response {
            id: cmd.id,
            status: "error".to_string(),
            result: None,
            message: Some(format!("Unknown command: {}", cmd.command)),
        }
    }
}

