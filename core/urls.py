from django.contrib import admin
from django.urls import path
from uql.config import UQLConfig
from uql.views import UQLView
from app.models.users import User
from .constants import Roles


class Config(UQLConfig):
    raise_exceptions = False  # raise errors instead of reporting them as data
    models = []  # list the models that should be configured for uql
    functions = []  # custom functions

    @staticmethod
    def getAuthenticatedUserRoles(user: User) -> str:
        if user.is_anonymous:
            return Roles.ANON
        if user.is_superuser:
            return Roles.ADMIN
        return Roles.USER


urlpatterns = [
    path("admin/", admin.site.urls),
    path("app/", UQLView(UQLConfig).as_view()),
]
