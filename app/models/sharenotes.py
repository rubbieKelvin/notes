"""Handle shared notes"""

from uuid import uuid4
from django.db import models


class Shared(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    note = models.ForeignKey(
        "app.Note", on_delete=models.CASCADE, related_name="shares"
    )
    shared_with = models.ForeignKey(
        "app.User", on_delete=models.CASCADE, related_name="shared_notes"
    )
    date_shared = models.DateTimeField(auto_now_add=True)
