from django.db import models
from typing_extensions import Self
from rest_framework.serializers import ModelSerializer


class ModelMixin:
    def __str__(self) -> str:
        return self.__class__.__name__

    @staticmethod
    def create() -> Self:
        pass

    def update() -> Self:
        pass

    def delete() -> None:
        pass

    @staticmethod
    def find(*queries: models.Q) -> models.QuerySet[Self]:
        pass
