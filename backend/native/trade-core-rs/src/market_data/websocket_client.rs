use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{StreamExt, SinkExt};
use log::{info, error, warn, debug};
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;

pub struct WebSocketClient {
    base_url: String,
    subscriptions: Vec<String>,
}

impl WebSocketClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            subscriptions: Vec::new(),
        }
    }

    pub fn add_subscription(&mut self, stream: &str) {
        self.subscriptions.push(stream.to_string());
    }

    pub async fn run(&self) {
        // Construct full URL with streams if using Binance query param style, 
        // or connect then subscribe. Binance supports both. 
        // For simplicity with large lists, we'll connect then subscribe.
        
        // However, Binance combined stream url format: wss://stream.binance.com:9443/stream?streams=<stream1>/<stream2>
        // Or single raw stream: wss://stream.binance.com:9443/ws/<stream>
        
        let url = if !self.subscriptions.is_empty() {
             // Using combined stream mode
             let streams = self.subscriptions.join("/");
             format!("{}/stream?streams={}", self.base_url, streams)
        } else {
             format!("{}/ws", self.base_url)
        };

        loop {
            info!("Connecting to WebSocket: {}", url);
            
            match connect_async(&url).await {
                Ok((ws_stream, _)) => {
                    info!("Connected successfully to Market Data Stream");
                    let (mut write, mut read) = ws_stream.split();

                    // Main loop for this connection
                    loop {
                        tokio::select! {
                            msg = read.next() => {
                                match msg {
                                    Some(Ok(Message::Text(text))) => {
                                        self.handle_message(&text);
                                    }
                                    Some(Ok(Message::Ping(ping))) => {
                                        debug!("Received Ping");
                                        if let Err(e) = write.send(Message::Pong(ping)).await {
                                            error!("Failed to send Pong: {}", e);
                                            break;
                                        }
                                    }
                                    Some(Ok(Message::Close(_))) => {
                                        warn!("Server closed connection");
                                        break;
                                    }
                                    Some(Err(e)) => {
                                        error!("Error reading message: {}", e);
                                        break;
                                    }
                                    None => {
                                        warn!("Stream ended");
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to connect: {}", e);
                }
            }

            warn!("Connection lost. Reconnecting in 5 seconds...");
            sleep(Duration::from_secs(5)).await;
        }
    }

    fn handle_message(&self, text: &str) {
        // Parse JSON
        if let Ok(v) = serde_json::from_str::<Value>(text) {
            // Handle "stream" payload format from Binance combined streams
            // {"stream":"<streamName>", "data": {...}}
            if let Some(data) = v.get("data") {
                self.process_event(data);
            } else {
                // Raw stream
                self.process_event(&v);
            }
        } else {
            error!("Failed to parse message: {}", text);
        }
    }

    fn process_event(&self, data: &Value) {
        // Instead of just logging, we need to output standard JSON-RPC notification
        // Structure: { "method": "market_data", "params": { ...data... } }
        
        // We print directly to stdout using println! which is our "bridge"
        // Ensure we don't use log! macro here for the data itself
        
        let notification = serde_json::json!({
            "method": "market_data",
            "params": data
        });
        
        println!("{}", notification.to_string());
    }
}
