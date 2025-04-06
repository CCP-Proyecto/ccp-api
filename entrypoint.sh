#!/bin/bash

set -e

# Run migrations first
echo "Running database migrations..."
bun run db:migrate

# Then start the application
echo "Starting application..."
exec "$@"


