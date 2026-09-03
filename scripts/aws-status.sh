#!/usr/bin/env bash
# Show whether the deployment is currently on or off, and what that costs.
set -euo pipefail
source "$(dirname "$0")/aws-env.sh"

STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" \
  --query 'Reservations[0].Instances[0].State.Name' --output text)

echo "EC2 instance ($INSTANCE_ID): $STATE"

if curl -fsS -m 8 "$API_URL/health" >/dev/null 2>&1; then
  echo "Backend API:  UP    $API_URL"
else
  echo "Backend API:  DOWN  $API_URL"
fi

if curl -fsS -m 8 -o /dev/null "$FRONTEND_URL/"; then
  echo "Frontend:     UP    $FRONTEND_URL   (S3+CloudFront — always on, no idle cost)"
else
  echo "Frontend:     DOWN  $FRONTEND_URL"
fi

echo
if [ "$STATE" = "running" ]; then
  echo "Billing: EC2 compute is accruing. Run ./scripts/aws-stop.sh when you're done demoing."
else
  echo "Billing: EC2 compute is NOT accruing. Run ./scripts/aws-start.sh before your next demo."
fi
