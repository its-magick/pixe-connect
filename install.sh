#!/bin/sh
mv . /app
# Install nvm if not already installed
if ! command -v nvm >/dev/null 2>&1; then
    echo "nvm is required but it's not installed. Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
fi

# Use nvm to install Node.js and npm
export VER=20.9.0
nvm install $VER
nvm use $VER

# Install dependencies
npm install /app/package.json

# Start the application as a background job
node /app/index.js &