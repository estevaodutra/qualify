$url = "https://n8n.6ksfuf.easypanel.host/webhook/manager_chats"
$body = @{
    "provider" = "z_api"
    "instance_id" = "3E249F618B74B1ABEF461664B40E8DC7"
    "instance_token" = "39634632AE91F414F083E442"
    "api_key" = "Fc02cd9d107f64e4886ff6eed2328f147S"
    "action" = "chats"
    "content" = @{}
}
$jsonBody = $body | ConvertTo-Json -Compress

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Output "Sending request to n8n: $url"
    $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Post -Body $jsonBody
    Write-Output "Success response from n8n:"
    Write-Output ($res | ConvertTo-Json -Depth 5)
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
