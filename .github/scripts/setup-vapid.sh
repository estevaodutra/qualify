#!/usr/bin/env bash
set -euo pipefail

cd /root/qualify-supabase
umask 077

if [[ ! -s .env.push ]]; then
  key_file=$(mktemp)
  trap 'rm -f "$key_file"' EXIT
  openssl ecparam -name prime256v1 -genkey -noout -out "$key_file"
  python3 - "$key_file" > .env.push.tmp <<'PY'
import base64
import subprocess
import sys

key_file = sys.argv[1]
private_der = subprocess.check_output(["openssl", "ec", "-in", key_file, "-outform", "DER"], stderr=subprocess.DEVNULL)
public_der = subprocess.check_output(["openssl", "ec", "-in", key_file, "-pubout", "-conv_form", "uncompressed", "-outform", "DER"], stderr=subprocess.DEVNULL)
marker = private_der.find(b"\x04\x20")
if marker < 0 or len(private_der[marker + 2:marker + 34]) != 32:
    raise SystemExit("Could not extract VAPID private key")
public_key = public_der[-65:]
if len(public_key) != 65 or public_key[0] != 4:
    raise SystemExit("Could not extract VAPID public key")
encode = lambda value: base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")
print("VAPID_PUBLIC_KEY=" + encode(public_key))
print("VAPID_PRIVATE_KEY=" + encode(private_der[marker + 2:marker + 34]))
print("VAPID_SUBJECT=mailto:suporte@qualifys.app")
PY
  mv .env.push.tmp .env.push
fi

chmod 600 .env.push
cat > docker-compose.criafy-oauth.yml <<'YAML'
services:
  functions:
    env_file:
      - .env.criafy
      - .env.push
YAML

docker compose -f docker-compose.yml -f docker-compose.criafy-oauth.yml up -d --force-recreate functions
docker exec qualify-supabase-edge-functions sh -c 'test -n "$INSTAGRAM_APP_SECRET" && test -n "$VAPID_PUBLIC_KEY" && test -n "$VAPID_PRIVATE_KEY"'
