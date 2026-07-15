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

Write-Host "Arquivos atualizados com sucesso."