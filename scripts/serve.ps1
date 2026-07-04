param(
    [int]$Port = 8000
)

$listener = New-Object System.Net.HttpListener
$prefixes = @(
    "http://localhost:$Port/",
    "http://127.0.0.1:$Port/"
)
foreach ($prefix in $prefixes) {
    $listener.Prefixes.Add($prefix)
}
$listener.Start()
Write-Output "Serving $pwd on port $Port (http://localhost:$Port/ and http://127.0.0.1:$Port/)"

function Get-ContentType($ext) {
    switch ($ext.ToLower()) {
        '.html' { 'text/html' }
        '.htm' { 'text/html' }
        '.css' { 'text/css' }
        '.js' { 'application/javascript' }
        '.json' { 'application/json' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif' { 'image/gif' }
        '.svg' { 'image/svg+xml' }
        '.csv' { 'text/csv' }
        '.txt' { 'text/plain' }
        default { 'application/octet-stream' }
    }
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        Start-Job -ScriptBlock {
            param($ctx)
            $req = $ctx.Request
            $res = $ctx.Response

            $urlPath = [System.Web.HttpUtility]::UrlDecode($req.Url.AbsolutePath.TrimStart('/'))
            if ($urlPath -eq '') { $urlPath = 'index.html' }
            $filePath = Join-Path (Get-Location) $urlPath

            if (Test-Path $filePath) {
                try {
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $ext = [System.IO.Path]::GetExtension($filePath)
                    $res.ContentType = (Get-ContentType $ext)
                    $res.ContentLength64 = $bytes.Length
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.OutputStream.Close()
                } catch {
                    $res.StatusCode = 500
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
                    $res.OutputStream.Write($msg,0,$msg.Length)
                    $res.OutputStream.Close()
                }
            } else {
                $res.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                $res.OutputStream.Write($msg,0,$msg.Length)
                $res.OutputStream.Close()
            }
        } -ArgumentList $context | Out-Null
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
