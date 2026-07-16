$ProjetoPath = $PSScriptRoot
$IniciarFlask = Join-Path $ProjetoPath "iniciar_flask.ps1"
$LogErro = Join-Path $ProjetoPath "flask_erro.log"
$Url = "http://127.0.0.1:5000"

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

function Mostrar-Erro {
    param(
        [string]$Mensagem
    )

    Add-Type -AssemblyName PresentationFramework

    [System.Windows.MessageBox]::Show(
        $Mensagem,
        "Não foi possível abrir o Start CRM",
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Error
    ) | Out-Null
}

if (-not (Test-Path $IniciarFlask)) {
    Mostrar-Erro @"
O arquivo responsável por iniciar o servidor não foi encontrado.

Arquivo esperado:
$IniciarFlask

Entre em contato com o responsável pelo sistema.
"@

    exit 1
}

# Se o Flask não estiver respondendo, tenta iniciar.
if (-not (Testar-Flask)) {
    try {
        & powershell.exe `
            -NoProfile `
            -ExecutionPolicy Bypass `
            -File $IniciarFlask

        if ($LASTEXITCODE -ne 0) {
            throw "O script de inicialização terminou com erro."
        }
    }
    catch {
        $Detalhes = $_.Exception.Message

        if (Test-Path $LogErro) {
            $ConteudoLog = Get-Content $LogErro -Raw -ErrorAction SilentlyContinue

            if (-not [string]::IsNullOrWhiteSpace($ConteudoLog)) {
                $Detalhes += "`r`n`r`nDetalhes técnicos:`r`n$ConteudoLog"
            }
        }

        Mostrar-Erro @"
O servidor do Start CRM não pôde ser iniciado.

Verifique se o computador está funcionando corretamente e tente novamente.

$Detalhes
"@

        exit 1
    }
}

# Confirma novamente antes de abrir o navegador.
if (-not (Testar-Flask)) {
    Mostrar-Erro @"
O servidor do Start CRM foi acionado, mas não respondeu.

Endereço:
$Url

Tente reiniciar o computador. Se o problema continuar, entre em contato com o responsável pelo sistema.
"@

    exit 1
}

# Só abre o Edge quando o Flask realmente estiver funcionando.
try {
    Start-Process `
        -FilePath "msedge.exe" `
        -ArgumentList "--app=$Url"
}
catch {
    Mostrar-Erro @"
O servidor do Start CRM está funcionando, mas não foi possível abrir o Microsoft Edge.

Detalhes:
$($_.Exception.Message)
"@

    exit 1
}

exit 0