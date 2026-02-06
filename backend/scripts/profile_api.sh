#!/bin/bash

# Ensure Clinic is installed
if ! command -v clinic &> /dev/null
then
    echo "clinic could not be found, installing..."
    npm install -g clinic
fi

echo "🚀 Starting Clinic.js Profiling..."
echo "👉 Target: /api/catalog (Redis Cached)"
echo "👉 Duration: 10s"
echo "----------------------------------------"

# Build first to ensure clean dist
echo "🔨 Building project..."
npm run build

# Run Clinic Doctor with Autocannon
# on-port runs the command when the server starts listening
# --autocannon options:
# -c 50: 50 connections
# -d 10: 10 seconds duration
# path: /api/catalog
PORT=4000 clinic doctor --on-port 'autocannon -c 50 -d 10 localhost:4000/api/catalog' -- node dist/server.js

echo "✅ Profiling Complete! Check the .html file generated above."
