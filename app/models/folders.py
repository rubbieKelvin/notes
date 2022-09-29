from uuid import uuid4
from django.db import models


class Folder(models.Model):
    id = models.UUIDField(default=uuid4, primary_key=True)
    name = models.CharField(max_length=20)
    description = models.CharField(max_length=100, default=None, null=True)
    owner = models.ForeignKey(
        "app.User", on_delete=models.CASCADE, related_name="folders"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
