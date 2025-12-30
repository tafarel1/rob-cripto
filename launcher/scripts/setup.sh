#!/bin/bash
cd "$(dirname "$0")/../.."
echo "Installing dependencies..."
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
echo "Setup complete. Run ./launcher/scripts/start.sh to start."
