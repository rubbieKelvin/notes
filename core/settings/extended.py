from .constants import *

AUTH_USER_MODEL = "api.User"
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ]
}

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
]
