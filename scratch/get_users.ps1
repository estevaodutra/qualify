$url = "https://qualify.6ksfuf.easypanel.host"
$key = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0"

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

try {
    $res = Invoke-RestMethod -Uri "$url/auth/v1/admin/users" -Headers $headers -Method Get
    Write-Output ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Error $_
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $reader.ReadToEnd()
    }
}
