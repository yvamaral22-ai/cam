import importlib.util
import sys


REQUIRED_MODULES = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "pydantic_settings": "pydantic-settings",
    "cv2": "opencv-python",
    "numpy": "numpy",
}


def check_dependencies() -> None:
    missing = [package for module, package in REQUIRED_MODULES.items() if importlib.util.find_spec(module) is None]
    if missing:
        print("\n[KYTRONA VISION] Dependencias do backend nao instaladas:")
        for package in missing:
            print(f"  - {package}")
        print("\nRode estes comandos dentro da pasta backend:")
        print("  python -m venv venv")
        print("  .\\venv\\Scripts\\activate")
        print("  python -m pip install --upgrade pip")
        print("  python -m pip install -r requirements.txt")
        print("  python run.py\n")
        sys.exit(1)

    if sys.version_info >= (3, 13):
        print("[KYTRONA VISION] Aviso: Python 3.13+ pode ter incompatibilidades com OpenCV/YOLO.")
        print("[KYTRONA VISION] Para maior estabilidade, prefira Python 3.11 ou 3.12 neste MVP.\n")


if __name__ == "__main__":
    check_dependencies()
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
