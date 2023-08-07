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
    for port in range(5170, 5178):
        CORS_ALLOWED_ORIGINS.append(f"http://127.0.0.1:${port}")
        CORS_ALLOWED_ORIGINS.append(f"http://localhost:${port}")

MEDIA_URL = "/media/"  # or any prefix you choose
DEFAULT_FILE_STORAGE = (
    "django.core.files.storage.FileSystemStorage"
    if DevelopmentMode.DEV
    else "cloudinary_storage.storage.MediaCloudinaryStorage"
)

STATICFILES_STORAGE = (
    "django.contrib.staticfiles.storage.StaticFilesStorage"
    if DevelopmentMode.DEV
    else "cloudinary_storage.storage.StaticHashedCloudinaryStorage"
)

CLOUDINARY_STORAGE = {
    # other settings, like credentials
    "STATICFILES_MANIFEST_ROOT": BASE_DIR
    / "manifests"
}
