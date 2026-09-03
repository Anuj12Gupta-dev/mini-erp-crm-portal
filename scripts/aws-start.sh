#!/usr/bin/env bash
# Start the backend EC2 instance and wait until the API is actually serving traffic again.
# The Docker container restarts on its own (restart=unless-stopped + docker enabled at boot),
# so there is nothing to SSH in and do by hand.
set -euo pipefail
source "$(dirname "$0")/aws-env.sh"

echo "Starting instance $INSTANCE_ID ..."
aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" \
  --query 'StartingInstances[0].{From:PreviousState.Name,To:CurrentState.Name}' --output table

echo "Waiting for the instance to reach 'running' ..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"

echo "Instance is up. Waiting for the API to answer (Docker needs ~30-60s to boot the container) ..."
for i in $(seq 1 40); do
  if curl -fsS -m 5 "$API_URL/health" >/dev/null 2>&1; then
    echo
    echo "✅ Backend is live again."
    echo "   Frontend: $FRONTEND_URL"
    echo "   API:      $API_URL"
    exit 0
  fi
  printf '.'
  sleep 10
done

echo
echo "⚠️  Instance is running but the API did not respond within ~7 minutes."
echo "   Check the container with:"
echo "     ssh -i ~/.ssh/mini-erp-key.pem ubuntu@52.66.162.177 'docker ps -a && docker compose -f ~/mini-erp-crm-portal/docker-compose.yml logs --tail=50 server'"
exit 1
