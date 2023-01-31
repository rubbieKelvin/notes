from .constants import *

AUTH_USER_MODEL = "api.User"
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        x
        for x in (
            "rest_framework.renderers.JSONRenderer",
            "rest_framework.renderers.BrowsableAPIRenderer" if DEBUG else None,
        )
        if x
    ],
}

CORS_ALLOWED_ORIGINS = [
    i for i in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if i
]

if DevelopmentMode.DEV:
    CORS_ALLOWED_ORIGINS.append("http://127.0.0.1:5173")
    CORS_ALLOWED_ORIGINS.append("http://localhost:5173")
