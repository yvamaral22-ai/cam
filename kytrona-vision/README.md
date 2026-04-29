# KYTRONA VISION

MVP local de inteligencia por video para empresas, mercados, comercios e industrias.

O sistema usa cameras comuns para detectar pessoas, medir fluxo, acompanhar permanencia anonima em zonas, gerar alertas operacionais, registrar ocorrencias e exibir tudo em um dashboard web.

## Limites de privacidade do MVP

Esta versao nao implementa reconhecimento facial, nao identifica pessoas por nome, nao armazena embeddings faciais e nao compara rostos automaticamente. O tracking usa apenas IDs temporarios anonimos durante o processamento do video.

Ocorrencias podem armazenar evidencias operacionais como imagem e clipe de video, mas sem identificacao biometrica automatica.

## Estrutura

```text
kytrona-vision/
  backend/
    app/
      main.py
      config.py
      database.py
      models.py
      schemas.py
      websocket.py
      routes/
      services/
    videos/
    snapshots/
    requirements.txt
    run.py
  frontend/
    src/
      api/
      components/
      pages/
      styles/
    package.json
```

## Backend

Recomendado: Python 3.11 ou 3.12. Python 3.13/3.14 pode ter incompatibilidades com OpenCV, NumPy ou Ultralytics dependendo das wheels disponiveis.

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python run.py
```

No Windows, tambem existe um setup rapido:

```powershell
cd backend
.\setup_backend.ps1
```

API local: `http://localhost:8000`

Documentacao FastAPI: `http://localhost:8000/docs`

O banco SQLite `kytrona.db` e criado automaticamente. Ele inicia sem cameras cadastradas: a tela mostra apenas cameras criadas por voce.

Zonas, identificacoes e watchlist nao sao criadas automaticamente. Elas aparecem no video somente depois que voce cadastrar. Exemplo: crie uma camera chamada `Corredor 1`, abra `Operar camera`, adicione a identificacao `Pessoa`, e entao essa camera passa a buscar pessoas.

Se voce ja rodou uma versao anterior que criou cameras de exemplo, limpe o banco antigo:

```powershell
cd backend
del kytrona.db
python run.py
```

Para testar video local, coloque um arquivo em:

```text
backend/videos/exemplo.mp4
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Interface local: `http://localhost:5173`

Se o backend estiver em outra URL, use:

```powershell
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

## Principais endpoints

Cameras:

- `GET /cameras`
- `POST /cameras`
- `GET /cameras/{id}`
- `PUT /cameras/{id}`
- `DELETE /cameras/{id}`

Zonas:

- `GET /zones`
- `POST /zones`
- `GET /zones/{id}`
- `PUT /zones/{id}`
- `DELETE /zones/{id}`

Alertas:

- `GET /alerts`
- `GET /alerts/recent`
- `PUT /alerts/{id}/resolve`
- `POST /alerts/{id}/convert-to-occurrence`

Ocorrencias:

- `GET /occurrences`
- `POST /occurrences`
- `GET /occurrences/{id}`
- `PUT /occurrences/{id}`
- `DELETE /occurrences/{id}`

Watchlist operacional:

- `GET /watchlist`
- `POST /watchlist`
- `GET /watchlist/{id}`
- `PUT /watchlist/{id}`
- `DELETE /watchlist/{id}`

Analytics:

- `GET /analytics/overview`
- `GET /analytics/cameras/{id}`
- `GET /analytics/zones/{id}`
- `GET /analytics/cashiers-ranking`

Video e tempo real:

- `GET /stream/{camera_id}` para MJPEG processado
- `WS /ws/alerts` para alertas em tempo real

## Como funciona

O `video_processor.py` abre webcam, arquivo local, camera IP na rede, RTSP ou perfil DSS Client/Dahua com OpenCV + FFmpeg. Para DSS/Dahua, o cadastro monta a URL RTSP no formato `rtsp://usuario:senha@servidor:9100/cam/realmonitor?channel=1&subtype=1`, usando RTSP/TCP como ponte para o MJPEG exibido no navegador. Para cameras IP comuns, normalmente voce precisa informar a URL do stream, por exemplo `http://192.168.0.20:8080/video`, `http://192.168.0.30/mjpeg` ou `rtsp://usuario:senha@192.168.0.40:554/stream1`. Quando YOLO esta disponivel, `detection_service.py` detecta somente a classe `person`. Se nao houver camera ou modelo disponivel, o sistema gera frames demonstrativos para o dashboard nao quebrar.

O `tracking_service.py` mantem IDs temporarios anonimos entre frames e calcula permanencia por zona. O `alert_service.py` cria alertas comportamentais por area proibida, permanencia acima do limite, movimento fora do horario, fila/aglomeracao e entrada em zona critica.

O modulo `Ocorrencias` permite registro manual e conversao de alertas em ocorrencias, mantendo evidencias por caminho de arquivo e observacoes de seguranca.

A `Watchlist` e operacional e manual: descreve comportamentos, zonas ou procedimentos que exigem atencao da equipe, sem cadastro biometrico e sem comparacao automatica de pessoas.
