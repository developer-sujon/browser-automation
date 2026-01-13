#!/bin/bash

CLUSTER_NAME="eazyslot-cluster"

echo "Destroying Kubernetes cluster to save costs..."
doctl kubernetes cluster delete $CLUSTER_NAME --force

echo "Cluster destroyed successfully. No further billing for compute."
