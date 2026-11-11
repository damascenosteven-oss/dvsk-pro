#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "请使用 sudo 运行此脚本。" >&2
  exit 1
fi

read_secret() {
  local prompt="$1"
  local variable_name="$2"
  local value
  read -r -s -p "$prompt" value
  printf '\n'
  if [[ -z "$value" || "$value" =~ [[:space:]] ]]; then
    echo "该值不能为空或包含空白字符。" >&2
    exit 1
  fi
  printf -v "$variable_name" '%s' "$value"
}

read_secret "DeepSeek API Key: " deepseek_api_key
read_secret "COS SecretId: " cos_secret_id
read_secret "COS SecretKey: " cos_secret_key
read -r -p "COS Bucket（格式 name-appid）: " cos_bucket
read -r -p "COS Region [ap-shanghai]: " cos_region
cos_region="${cos_region:-ap-shanghai}"
read_secret "PPT 统一邀请码: " invite_password

if [[ ! "$cos_bucket" =~ ^[a-z0-9][a-z0-9-]{1,62}-[0-9]+$ ]]; then
  echo "COS Bucket 格式不正确，应类似 example-1250000000。" >&2
  exit 1
fi
if [[ ! "$cos_region" =~ ^[a-z0-9-]+$ ]]; then
  echo "COS Region 格式不正确。" >&2
  exit 1
fi

session_secret="$(openssl rand -hex 32)"
temporary_file="$(mktemp)"
trap 'rm -f "$temporary_file"' EXIT
chmod 0600 "$temporary_file"
printf '%s\n' \
  "PPT_INVITE_PASSWORD=$invite_password" \
  "PPT_SESSION_SECRET=$session_secret" \
  "DEEPSEEK_API_KEY=$deepseek_api_key" \
  "DEEPSEEK_MODEL=deepseek-flash" \
  "DEEPSEEK_BASE_URL=https://api.deepseek.com" \
  "COS_SECRET_ID=$cos_secret_id" \
  "COS_SECRET_KEY=$cos_secret_key" \
  "COS_BUCKET=$cos_bucket" \
  "COS_REGION=$cos_region" \
  "COS_ENDPOINT=https://cos.$cos_region.myqcloud.com" \
  "PPT_ENGINE_ROOT=/opt/yuling-ai-ppt/current/engine" > "$temporary_file"
install -o root -g root -m 0600 "$temporary_file" /etc/yuling-ai-ppt.env
echo "配置已安全写入 /etc/yuling-ai-ppt.env（0600），密钥未回显。"
