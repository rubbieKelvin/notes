from uuid import uuid4
from django.db import models


class Feature(models.Model):
    id = models.UUIDField(default=uuid4, primary_key=True, editable=False)
    key = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=False)
    is_active_for = models.ManyToManyField(
        "api.user", related_name="targeted_active_features", blank=True
    )
    is_inactive_for = models.ManyToManyField(
        "api.user", related_name="targeted_inactive_features", blank=True
    )
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    allow_anon = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.key
