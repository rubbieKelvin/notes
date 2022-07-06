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
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)

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
        new.is_active = True
        new.set_password(password)
        new.save()
        return new

    def update(self, name: str|None, email: str|None, password: str|None, is_active: bool|None=None) -> Self:
        self.email = email or self.email
        self.name = name or self.name
        if is_active != None: self.is_active = is_active
        if password: self.set_password(password)
        self.save()
        return self

    @staticmethod
    def all() -> models.QuerySet(Self):
        return User.objects.filter(is_active=True)
