$url = "https://qualify.6ksfuf.easypanel.host"
$key = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0"

$adminHeaders = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

$userId = "5358e25d-6332-4c63-9107-bdfc3b8e9f0d" # teste@teste.com
$companyId = "e0cd248a-f0e3-44bb-8cc6-525d1949da49" # Estevão company
$instanceId = "ab691272-83bd-4d20-bd47-7c474353254b" # Tablet | Wpp Normal | Estevão

# 1. Update password and confirm email for teste@teste.com to test123456
Write-Output "1. Updating password and confirming email for test user..."
$updateBody = @{
    "password" = "test123456"
    "email_confirm" = $true
} | ConvertTo-Json
try {
    $res = Invoke-RestMethod -Uri "$url/auth/v1/admin/users/$userId" -Headers $adminHeaders -Method Put -Body $updateBody
    Write-Output "Password updated successfully."
} catch {
    Write-Error "Failed to update password: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $reader.ReadToEnd()
    }
    Exit
}

# 2. Insert company membership if not exists
Write-Output "2. Checking/Inserting company membership..."
try {
    $members = Invoke-RestMethod -Uri "$url/rest/v1/company_members?user_id=eq.$userId" -Headers $adminHeaders -Method Get
    if ($members.Count -eq 0) {
        $newMember = @{
            "company_id" = $companyId
            "user_id" = $userId
            "role" = "member"
            "is_active" = $true
        } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$url/rest/v1/company_members" -Headers $adminHeaders -Method Post -Body $newMember
        Write-Output "Membership created."
    } else {
        Write-Output "Membership already exists."
    }
} catch {
    Write-Error "Failed to set company membership: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $reader.ReadToEnd()
    }
    Exit
}

# 3. Sign in as teste@teste.com
Write-Output "3. Signing in as test user..."
$signInBody = @{
    "email" = "teste@teste.com"
    "password" = "test123456"
} | ConvertTo-Json
$userJwt = ""
try {
    $authHeaders = @{
        "apikey" = $key
        "Content-Type" = "application/json"
    }
    $res = Invoke-RestMethod -Uri "$url/auth/v1/token?grant_type=password" -Headers $authHeaders -Method Post -Body $signInBody
    $userJwt = $res.access_token
    Write-Output "Signed in successfully. Token obtained."
} catch {
    Write-Error "Failed to sign in: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $reader.ReadToEnd()
    }
    Exit
}

# 4. Invoke zapi-proxy Edge Function
Write-Output "4. Invoking zapi-proxy edge function..."
$proxyHeaders = @{
    "apikey" = $key
    "Authorization" = "Bearer $userJwt"
    "Content-Type" = "application/json"
}
$proxyBody = @{
    "instanceId" = $instanceId
    "endpoint" = "/chats"
    "method" = "GET"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$url/functions/v1/zapi-proxy" -Headers $proxyHeaders -Method Post -Body $proxyBody
    Write-Output "Success response:"
    Write-Output ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Error "Function failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output "Response body:"
        Write-Output $reader.ReadToEnd()
    }
}
