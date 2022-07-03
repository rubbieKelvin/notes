from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

from apps.authr.managers import UserManager
from libs.mixins.model import ModelMixin
from typing_extensions import Self


class User(AbstractBaseUser, PermissionsMixin, ModelMixin):
    email = models.EmailField('email address', unique=True)
    name = models.CharField(null=True, max_length=30)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @staticmethod
    def find(*queries: models.Q) -> models.QuerySet[Self]:
        return User.objects.filter(*queries)

    @staticmethod
    def create(email: str, password: str) -> Self:
        new = User(email=email)
        new.set_password(password)
        new.save()
        return new

    def update(self, email: str, password: str) -> Self:
        self.email = email
        self.set_password(password)
        self.save()
        return self
