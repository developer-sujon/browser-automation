#!/bin/bash

# Exit on error
set -e

APP_NAME="eazyslot"
REGION="us-central1"

echo "Deploying $APP_NAME to Cloud Run..."

# Deploy from source using Cloud Build automatically
gcloud run deploy $APP_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1

echo "Deployment complete!"
