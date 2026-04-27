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

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

API local: `http://localhost:8000`

Documentacao FastAPI: `http://localhost:8000/docs`

O banco SQLite `kytrona.db` e criado automaticamente. Na primeira inicializacao, o sistema cria:

- camera `Webcam Local` com source `0`
- camera `Video de Teste Local` apontando para `videos/exemplo.mp4`
- zona `Caixa 1`
- zona `Estoque Restrito`
- alerta demonstrativo
- ocorrencia demonstrativa sem biometria

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

O `video_processor.py` abre webcam, arquivo local ou RTSP com OpenCV. Quando YOLO esta disponivel, `detection_service.py` detecta somente a classe `person`. Se nao houver camera ou modelo disponivel, o sistema gera frames demonstrativos para o dashboard nao quebrar.

O `tracking_service.py` mantem IDs temporarios anonimos entre frames e calcula permanencia por zona. O `alert_service.py` cria alertas comportamentais por area proibida, permanencia acima do limite, movimento fora do horario, fila/aglomeracao e entrada em zona critica.

O modulo `Ocorrencias` permite registro manual e conversao de alertas em ocorrencias, mantendo evidencias por caminho de arquivo e observacoes de seguranca.

A `Watchlist` e operacional e manual: descreve comportamentos, zonas ou procedimentos que exigem atencao da equipe, sem cadastro biometrico e sem comparacao automatica de pessoas.
