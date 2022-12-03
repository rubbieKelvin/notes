from django.contrib import admin
from django.urls import path
from uql.config import UQLConfig
from uql.views import UQLView
from .uqlc import Config


urlpatterns = [
    path("admin/", admin.site.urls),
    path("uql/", UQLView(Config).as_view()),
]
