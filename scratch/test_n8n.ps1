$url = "https://n8n.6ksfuf.easypanel.host/webhook/manager_chats"
$body = @{
    "provider" = "z_api"
    "instance_id" = "3E249F618B74B1ABEF461664B40E8DC7"
    "instance_token" = "39634632AE91F414F083E442"
    "api_key" = "Fc02cd9d107f64e4886ff6eed2328f147S"
    "action" = "chats"
    "content" = @{}
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $res = Invoke-WebRequest -Uri $url -Headers $headers -Method Post -Body $body -TimeoutSec 10
    Write-Output "Status code: $($res.StatusCode)"
    Write-Output "Body:"
    Write-Output $res.Content
} catch {
    Write-Error $_
    if ($_.Exception.Response) {
        $resp = $_.Exception.Response
        Write-Output "Status code: $($resp.StatusCode)"
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        Write-Output "Body:"
        Write-Output $reader.ReadToEnd()
    }
}
