$ProjetoPath = "C:\Users\saman\Documents\mini-crm-start"
$Url = "http://127.0.0.1:5000"

Set-Location $ProjetoPath

# Inicia o servidor Flask em segundo plano
$Servidor = Start-Process `
    -FilePath "$ProjetoPath\venv\Scripts\python.exe" `
    -ArgumentList "app.py" `
    -WindowStyle Hidden `
    -PassThru

# Aguarda o Flask subir
Start-Sleep -Seconds 3

# Abre o CRM como aplicativo no Edge
$Navegador = Start-Process `
    -FilePath "msedge.exe" `
    -ArgumentList "--app=$Url" `
    -PassThru

# Aguarda a janela do navegador ser fechada
Wait-Process -Id $Navegador.Id

# Fecha o servidor Flask
if ($Servidor -and !$Servidor.HasExited) {
    Stop-Process -Id $Servidor.Id -Force
}