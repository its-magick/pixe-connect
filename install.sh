#!/bin/sh

# Check for prerequisites and install if not available
# if ! command -v make >/dev/null 2>&1; then
#     echo "make is required but it's not installed. Installing make from source..."
#     apt-get install -y build-essential
#     cd /tmp
#     curl -LO https://ftp.gnu.org/gnu/make/make-4.3.tar.gz
#     tar -xzf make-4.3.tar.gz
#     cd make-4.3
#     ./configure
#     make
#     make install
#     cd ..
#     rm -rf make-4.3 make-4.3.tar.gz
# fi

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required but it's not installed. Installing curl from source..."
    apt-get install -y build-essential
    cd /tmp
    curl -LO https://curl.se/download/curl-7.79.1.tar.gz
    tar -xzf curl-7.79.1.tar.gz
    cd curl-7.79.1
    ./configure
    make
    make install
    cd ..
    rm -rf curl-7.79.1 curl-7.79.1.tar.gz
fi

if ! command -v tar >/dev/null 2>&1; then
    echo "tar is required but it's not installed. Installing tar from source..."
    apt-get install -y build-essential
    cd /tmp
    curl -LO https://ftp.gnu.org/gnu/tar/tar-1.34.tar.gz
    tar -xzf tar-1.34.tar.gz
    cd tar-1.34
    ./configure
    make
    make install
    cd ..
    rm -rf tar-1.34 tar-1.34.tar.gz
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required but it's not installed. Installing Node.js from source..."
    apt-get install -y build-essential
    cd /tmp
    curl -LO https://nodejs.org/dist/v20.9.0/node-v20.9.0.tar.gz
    tar -xzf node-v20.9.0.tar.gz
    cd node-v20.9.0
    ./configure
    make
    make install
    cd ..
    rm -rf node-v20.9.0 node-v20.9.0.tar.gz
fi

# Install dependencies
npm install

# Start the application as a background job
node index.js &