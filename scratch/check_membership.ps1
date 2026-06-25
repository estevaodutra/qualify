$url = "https://qualify.6ksfuf.easypanel.host"
$key = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0"

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

# 1. Check company membership for teste@teste.com
$userId = "5358e25d-6332-4c63-9107-bdfc3b8e9f0d"
try {
    $membership = Invoke-RestMethod -Uri "$url/rest/v1/company_members?user_id=eq.$userId" -Headers $headers -Method Get
    Write-Output "Membership check:"
    Write-Output ($membership | ConvertTo-Json)
} catch {
    Write-Error $_
}
