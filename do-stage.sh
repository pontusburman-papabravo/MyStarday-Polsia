#!/bin/bash
set -e
cd /opt/polsia/workspaces/company-87240/agent-30/exec-3284067/stjarndag

write_blob() {
  local path="$1"
  local blob=$(git hash-object -w "$path")
  local mode=$(git ls-files -s "$path" 2>/dev/null | cut -d' ' -f1-2)
  if [ -z "$mode" ]; then
    mode="100644"
  fi
  echo "blob=$blob path=$path mode=$mode"
  echo "$blob" | git update-index --add --cacheinfo "$mode" "$blob" "$path"
}

write_blob migrations/1790030000000_pedagog_roles_and_revocation.js
write_blob migrations/1790040000000_pedagog_invite.js
write_blob migrations/1790040000001_pedagog_invite_catchup.js
write_blob migrations/1790050000000_meals_structured.js

git ls-files --stage | grep -E "17900[345]"