#!/usr/bin/env bash
# Stop the backend EC2 instance to stop compute charges.
# The frontend (S3 + CloudFront) stays up but the API will be unreachable until you run aws-start.sh.
set -euo pipefail
source "$(dirname "$0")/aws-env.sh"

echo "Stopping instance $INSTANCE_ID ..."
aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" \
  --query 'StoppingInstances[0].{From:PreviousState.Name,To:CurrentState.Name}' --output table

echo "Waiting for it to reach 'stopped' (usually ~30-60s) ..."
aws ec2 wait instance-stopped --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo
echo "✅ Backend stopped. EC2 compute charges have stopped."
echo "   Your data is safe — it lives in Neon, not on this instance."
echo "   Run ./scripts/aws-start.sh before your next demo."
