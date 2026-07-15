$ProjetoPath = "C:\Users\saman\Documents\mini-crm-start"
$PythonPath = Join-Path $ProjetoPath "venv\Scripts\python.exe"
$AppPath = Join-Path $ProjetoPath "app.py"
$Url = "http://127.0.0.1:5000"

$LogSaida = Join-Path $ProjetoPath "flask_saida.log"
$LogErro = Join-Path $ProjetoPath "flask_erro.log"

Set-Location $ProjetoPath

if (-not (Test-Path $PythonPath)) {
    Add-Type -AssemblyName PresentationFramework

    [System.Windows.MessageBox]::Show(
        "Python não encontrado em:`r`n$PythonPath",
        "Erro ao iniciar Start CRM",
        "OK",
        "Error"
    ) | Out-Null

    exit 1
}

if (-not (Test-Path $AppPath)) {
    Add-Type -AssemblyName PresentationFramework

    [System.Windows.MessageBox]::Show(
        "Arquivo app.py não encontrado em:`r`n$AppPath",
        "Erro ao iniciar Start CRM",
        "OK",
        "Error"
    ) | Out-Null

    exit 1
}

# Verifica se o Flask já está respondendo.
$ServidorJaAtivo = $false

try {
    Invoke-WebRequest `
        -Uri $Url `
        -UseBasicParsing `
        -TimeoutSec 2 `
        -ErrorAction Stop | Out-Null

    $ServidorJaAtivo = $true
}
catch {
    $ServidorJaAtivo = $false
}

if (-not $ServidorJaAtivo) {
    # Encerra possíveis processos antigos do CRM que ficaram travados.
    Get-CimInstance Win32_Process |
        Where-Object {
            ($_.Name -eq "python.exe" -or $_.Name -eq "pythonw.exe") -and
            $_.CommandLine -like "*mini-crm-start*app.py*"
        } |
        ForEach-Object {
            Stop-Process `
                -Id $_.ProcessId `
                -Force `
                -ErrorAction SilentlyContinue
        }

    Remove-Item `
        $LogSaida, `
        $LogErro `
        -Force `
        -ErrorAction SilentlyContinue

    # Inicia o Flask em segundo plano.
    $Servidor = Start-Process `
        -FilePath $PythonPath `
        -ArgumentList "`"$AppPath`"" `
        -WorkingDirectory $ProjetoPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput $LogSaida `
        -RedirectStandardError $LogErro `
        -PassThru

    $ServidorDisponivel = $false

    # Aguarda até 20 segundos para o Flask responder.
    for ($Tentativa = 1; $Tentativa -le 20; $Tentativa++) {
        Start-Sleep -Seconds 1

        try {
            Invoke-WebRequest `
                -Uri $Url `
                -UseBasicParsing `
                -TimeoutSec 2 `
                -ErrorAction Stop | Out-Null

            $ServidorDisponivel = $true
            break
        }
        catch {
            # Continua aguardando.
        }

        if ($Servidor.HasExited) {
            break
        }
    }

    if (-not $ServidorDisponivel) {
        $Mensagem = "O servidor do Start CRM não iniciou."

        if (Test-Path $LogErro) {
            $ErroFlask = Get-Content $LogErro -Raw

            if ($ErroFlask) {
                $Mensagem += "`r`n`r`nDetalhes:`r`n$ErroFlask"
            }
        }

        Add-Type -AssemblyName PresentationFramework

        [System.Windows.MessageBox]::Show(
            $Mensagem,
            "Erro ao iniciar Start CRM",
            "OK",
            "Error"
        ) | Out-Null

        exit 1
    }
}

# Abre o CRM como aplicativo no Microsoft Edge.
Start-Process `
    -FilePath "msedge.exe" `
    -ArgumentList "--app=$Url"

# O Flask permanece ativo em segundo plano.
exit 0