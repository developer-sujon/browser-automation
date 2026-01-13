#!/bin/bash

set -e

REGISTRY_NAME="eazyslot-registry"
IMAGE_NAME="eazyslot"
CLUSTER_NAME="eazyslot-cluster"
REGION="blr1"

echo "Step 1: Creating DigitalOcean Container Registry..."
doctl registry create $REGISTRY_NAME || echo "Registry already exists"

echo "Step 2: Docker login..."
doctl registry login

echo "Step 3: Building multi-arch Docker image for linux/amd64..."
# Ensure buildx is available and selected
docker buildx create --use >/dev/null 2>&1 || true

# Build and push for linux/amd64 to avoid platform mismatch on DOKS nodes
docker buildx build \
  --platform linux/amd64 \
  -t registry.digitalocean.com/$REGISTRY_NAME/$IMAGE_NAME:latest \
  --push .

echo "Step 4: Image pushed (linux/amd64)."

echo "Step 5: Creating Kubernetes cluster (if not exists)..."
doctl kubernetes cluster get $CLUSTER_NAME || \
doctl kubernetes cluster create $CLUSTER_NAME \
  --region $REGION \
  --version latest \
  --node-pool "name=workers;size=s-4vcpu-8gb;count=2;auto-scale=true;min-nodes=1;max-nodes=15"

echo "Step 6: Configuring kubectl..."
doctl kubernetes cluster kubeconfig save $CLUSTER_NAME

echo "Step 7: Setting up registry access..."
doctl registry kubernetes-manifest | kubectl apply -f -

echo "Step 8: Creating secrets..."
# Load env vars from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set. Please set it in .env or environment."
  exit 1
fi

# Create secret (idempotent-ish: delete first or just apply)
kubectl create secret generic eazyslot-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=target-url="${TARGET_URL:-https://example.com/contact}" \
  --dry-run=client -o yaml | kubectl apply -f -
        
echo "Step 9: Calculating pending files..."
# Install dependencies if needed (assuming node_modules might not be there in CI, but here it is local)
# bun install

FILE_COUNT=$(bun src/count-files.ts | tr -cd '0-9')
echo "Found $FILE_COUNT pending files."

if [ -z "$FILE_COUNT" ]; then
  FILE_COUNT=0
fi

if [ "$FILE_COUNT" -eq "0" ]; then
  echo "No pending files found. Skipping job deployment."
  exit 0
fi

# Adjust node pool autoscaler to match pending file count
echo "Step 10: Adjusting worker node pool size to $FILE_COUNT..."
# Find the workers node pool ID (portable JSON parsing)
POOL_ID=$(doctl kubernetes node-pool list $CLUSTER_NAME -o json | python3 - <<'PY'
import sys, json
try:
    arr = json.load(sys.stdin)
    for np in arr:
        if np.get('name') == 'workers':
            print(np.get('id',''))
            break
except Exception as e:
    pass
PY
)
if [ -z "$POOL_ID" ]; then
  echo "Warning: workers node pool not found; skipping autoscaler update."
else
  doctl kubernetes node-pool update $CLUSTER_NAME $POOL_ID \
    --auto-scale=true \
    --min-nodes=1 \
    --max-nodes=$FILE_COUNT || echo "Warning: node-pool update failed"
fi

echo "Step 11: Preparing dynamic job configuration..."
# Create a temporary job file
cp k8s/batch-job.yaml k8s/batch-job-dynamic.yaml

# Replace parallelism and completions with FILE_COUNT
# macOS sed requires empty string for -i
sed -i '' "s/parallelism: .*/parallelism: $FILE_COUNT/" k8s/batch-job-dynamic.yaml
sed -i '' "s/completions: .*/completions: $FILE_COUNT/" k8s/batch-job-dynamic.yaml

echo "Step 12: Deploying batch job with $FILE_COUNT workers..."
# Delete existing job if it exists to allow re-run
kubectl delete job eazyslot-batch --ignore-not-found=true
kubectl apply -f k8s/batch-job-dynamic.yaml

# Clean up
rm k8s/batch-job-dynamic.yaml

echo "Deployment complete!"
echo ""
echo "Monitor with:"
echo "  kubectl get pods -l app=eazyslot -w"
echo "  kubectl logs -l app=eazyslot --tail=50 -f"
