def errorTemplate(message: str, code: str = None, **meta) -> dict:
    return {"error": dict(
        message=message,
        code=code,
        **meta
    )}
