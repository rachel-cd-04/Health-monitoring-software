API=http://localhost:3000/api
chat() { curl -s -w '\nHTTP %{http_code}\n' -X POST $API/assistant/chat -H 'Content-Type: application/json' "$@"; }

# Log in and keep the tokens
ANA=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"astronaut_id":1,"pin":"1111"}' | jq -r .token)
LEO=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"astronaut_id":2,"pin":"2222"}' | jq -r .token)
echo "$ANA" | cut -c1-20   # should print the start of a JWT, not "null"

# Usage: chat -H "Authorization: Bearer $ANA" -d '{"message":"Summarize my heart-rate trend this week."}'