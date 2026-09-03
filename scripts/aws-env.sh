#!/usr/bin/env bash
# Shared config for the AWS start/stop/status scripts.
# Override any value by exporting it before running, e.g. AWS_REGION=us-east-1 ./scripts/aws-status.sh

export INSTANCE_ID="${INSTANCE_ID:-i-06411c46fd4c364e0}"
export AWS_REGION="${AWS_REGION:-ap-south-1}"
export FRONTEND_URL="${FRONTEND_URL:-https://d3i9zqel4cra9v.cloudfront.net}"
export API_URL="${API_URL:-https://d3iqgyhmlqxdcf.cloudfront.net}"
