Write-Host "Starting analytics backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$PSScriptRoot\..\services\analytics-backend`"; npm.cmd run dev"

Write-Host "Starting analytics MCP wrapper..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$PSScriptRoot\..\services\analytics-mcp`"; npm.cmd run dev"

Write-Host "Starting chatbot UI..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$PSScriptRoot\..\apps\chatbot`"; npm.cmd run dev"

Write-Host "Started backend + MCP + UI in separate terminals."
