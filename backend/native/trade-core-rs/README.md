# RoboCrypto Trade Core (Rust)

## Setup
1. Ensure Rust is installed.
   - If using Windows without MSVC, install GNU toolchain:
     ```powershell
     rustup toolchain install stable-x86_64-pc-windows-gnu
     rustup default stable-x86_64-pc-windows-gnu
     ```

## Running
```powershell
cargo run
```

## Features
- **High Performance WebSocket Client**: Connects to Binance Streams.
- **SMC Analysis**: Implemented in Rust for max speed.
- **Multi-threaded**: Uses Tokio runtime.
