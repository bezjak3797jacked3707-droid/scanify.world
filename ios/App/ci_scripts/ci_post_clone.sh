#!/bin/sh
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Xcode Cloud's build images don't include Node.js by default
brew install node

npm install
npx cap sync ios