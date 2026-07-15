param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDirectory
)

$ErrorActionPreference = "Stop"

$DestinationDirectory = "C:\Users\saman\Documents\mini-crm-start"

Write-Host "Iniciando deploy..."
Write-Host "Origem: $SourceDirectory"
Write-Host "Destino: $DestinationDirectory"

if (-not (Test-Path $SourceDirectory)) {
    throw "A pasta de origem não foi encontrada: $SourceDirectory"
}

if (-not (Test-Path $DestinationDirectory)) {
    throw "A pasta do sistema não foi encontrada: $DestinationDirectory"
}

robocopy `
    $SourceDirectory `
    $DestinationDirectory `
    /E `
    /XD `
        ".git" `
        ".github" `
        "scripts" `
        "venv" `
        ".venv" `
        "__pycache__" `
        "instance" `
        "actions-runner" `
    /XF `
        ".env" `
        "*.db" `
        "*.sqlite" `
        "*.sqlite3" `
        "*.pyc" `
    /R:3 `
    /W:3

$RobocopyExitCode = $LASTEXITCODE

if ($RobocopyExitCode -ge 8) {
    throw "Erro ao copiar os arquivos. Código do Robocopy: $RobocopyExitCode"
}

Write-Host "Reiniciando o servidor Flask..."

$ProjetoPath = "C:\Users\saman\Documents\mini-crm-start"

$ProcessosFlask = Get-CimInstance Win32_Process |
    Where-Object {
        ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and
        $_.CommandLine -like "*$ProjetoPath*app.py*"
    }

foreach ($Processo in $ProcessosFlask) {
    Stop-Process -Id $Processo.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

Start-Process `
    -FilePath "$ProjetoPath\venv\Scripts\python.exe" `
    -ArgumentList "app.py" `
    -WorkingDirectory $ProjetoPath `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host "Arquivos atualizados e servidor reiniciado com sucesso."
exit 0