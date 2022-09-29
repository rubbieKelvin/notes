from uuid import uuid4
from django.db import models


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    name = models.CharField(max_length=20)
    color = models.CharField(max_length=7, default=None, null=True)
    author = models.ForeignKey(
        "app.User", on_delete=models.CASCADE, related_name="tags"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
