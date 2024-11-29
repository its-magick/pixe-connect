#!/bin/sh

# Check for prerequisites and install if not available
if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required but it's not installed. Installing curl..."
    apt-get update && apt-get install -y curl
fi

if ! command -v tar >/dev/null 2>&1; then
    echo "tar is required but it's not installed. Installing tar..."
    apt-get update && apt-get install -y tar
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required but it's not installed. Installing npm..."
    apt-get update && apt-get install -y npm
fi

export VER=20.9.0

curl https://nodejs.org/dist/v$VER/node-v$VER-linux-x64.tar.xz | tar --file=- --extract --xz --directory /usr/local/ --strip-components=1

export PATH=/usr/local/bin:$PATH

# Install dependencies
npm install

# Start the application as a background job
node index.js &