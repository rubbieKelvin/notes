"""core URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from uql.views import createUQLView
from api.functions import authentication
from api.functions import uploads
from api.functions import sharing
from api.constants import getUserRole
from api.functions import features

from api.emo import exposedmodels
from core.settings import DEBUG, DevelopmentMode


urlpatterns = [
    path("admin/", admin.site.urls),  # admin
    path(
        "uql/",
        createUQLView(
            models=exposedmodels,
            functions=[
                # ...
                authentication.login,
                authentication.logout,
                authentication.signup,
                authentication.me,
                # ...
                uploads.uploadImage,
                # ...
                sharing.shareNote,
                # ...
                features.hasFeature,
            ],
            raiseExceptions=False,#DEBUG and DevelopmentMode.DEV,
            userRoleFactory=getUserRole,
        ).as_view(),
    ),  # uql
]

from django.conf import settings
from django.conf.urls.static import static

# Serve media files on local
if DevelopmentMode.DEV:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
