from enum import StrEnum


class CameraType(StrEnum):
    webcam = "webcam"
    video_file = "video_file"
    rtsp = "rtsp"


class CameraStatus(StrEnum):
    online = "online"
    offline = "offline"


class ZoneType(StrEnum):
    caixa = "caixa"
    corredor = "corredor"
    estoque = "estoque"
    entrada = "entrada"
    area_restrita = "area_restrita"


class AlertSeverity(StrEnum):
    baixa = "baixa"
    media = "media"
    alta = "alta"
    critica = "critica"


class AlertStatus(StrEnum):
    novo = "novo"
    visualizado = "visualizado"
    resolvido = "resolvido"


class OccurrenceType(StrEnum):
    furto = "furto"
    roubo = "roubo"
    comportamento_suspeito = "comportamento_suspeito"
    acesso_indevido = "acesso_indevido"
    outro = "outro"


class OccurrenceStatus(StrEnum):
    em_analise = "em_analise"
    confirmado = "confirmado"
    falso_positivo = "falso_positivo"
    resolvido = "resolvido"
