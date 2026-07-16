$ErrorActionPreference = "Stop"

$ProjetoPath = "C:\Users\saman\Documents\mini-crm-start"
$PythonPath = Join-Path $ProjetoPath "venv\Scripts\python.exe"
$AppPath = Join-Path $ProjetoPath "app.py"
$Url = "http://127.0.0.1:5000"

$LogSaida = Join-Path $ProjetoPath "flask_saida.log"
$LogErro = Join-Path $ProjetoPath "flask_erro.log"

function Testar-Flask {
    try {
        Invoke-WebRequest `
            -Uri $Url `
            -UseBasicParsing `
            -TimeoutSec 2 `
            -ErrorAction Stop | Out-Null

        return $true
    }
    catch {
        return $false
    }
}

Set-Location $ProjetoPath

if (-not (Test-Path $PythonPath)) {
    throw "Python do ambiente virtual não encontrado em: $PythonPath"
}

if (-not (Test-Path $AppPath)) {
    throw "Arquivo principal do sistema não encontrado em: $AppPath"
}

# Se já estiver funcionando, não cria outra instância.
if (Testar-Flask) {
    exit 0
}

# Encerra somente processos antigos deste CRM.
Get-CimInstance Win32_Process |
    Where-Object {
        ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and
        $_.ExecutablePath -eq $PythonPath -and
        $_.CommandLine -like "*app.py*"
    } |
    ForEach-Object {
        Stop-Process `
            -Id $_.ProcessId `
            -Force `
            -ErrorAction SilentlyContinue
    }

Start-Sleep -Seconds 1

Remove-Item $LogSaida, $LogErro `
    -Force `
    -ErrorAction SilentlyContinue

# Inicia o Flask oculto e grava os logs.
$Servidor = Start-Process `
    -FilePath $PythonPath `
    -ArgumentList "`"$AppPath`"" `
    -WorkingDirectory $ProjetoPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $LogSaida `
    -RedirectStandardError $LogErro `
    -PassThru

# Aguarda até 30 segundos.
for ($Tentativa = 1; $Tentativa -le 30; $Tentativa++) {
    Start-Sleep -Seconds 1

    if (Testar-Flask) {
        exit 0
    }

    if ($Servidor.HasExited) {
        break
    }
}

$Detalhes = ""

if (Test-Path $LogErro) {
    $Detalhes = Get-Content $LogErro -Raw -ErrorAction SilentlyContinue
}

if ([string]::IsNullOrWhiteSpace($Detalhes)) {
    $Detalhes = "O processo foi iniciado, mas o endereço $Url não respondeu."
}

throw "Não foi possível iniciar o servidor do Start CRM.`r`n`r`n$Detalhes"