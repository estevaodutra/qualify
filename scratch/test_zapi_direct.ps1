$instanceId = "3E249F618B74B1ABEF461664B40E8DC7"
$token = "39634632AE91F414F083E442"
$clientToken = "Fc02cd9d107f64e4886ff6eed2328f147S"

$url = "https://api.z-api.io/instances/$instanceId/token/$token/chats"

$headers = @{
    "Client-Token" = $clientToken
}

try {
    Write-Output "Querying Z-API directly: $url"
    $res = Invoke-WebRequest -Uri $url -Headers $headers -Method Get -TimeoutSec 10
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
