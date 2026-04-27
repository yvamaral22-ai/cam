$ErrorActionPreference = "Stop"

Write-Host "Preparando ambiente Python do KYTRONA VISION..."

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "Python nao encontrado no PATH. Instale Python 3.11 ou 3.12 e tente novamente."
  exit 1
}

python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host ""
Write-Host "Backend pronto. Para iniciar:"
Write-Host ".\venv\Scripts\activate"
Write-Host "python run.py"
