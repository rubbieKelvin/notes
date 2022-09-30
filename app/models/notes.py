from uuid import uuid4
from django.db import models


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    title = models.CharField(max_length=50)
    description = models.CharField(max_length=500, default=None, null=True, blank=True)
    author = models.ForeignKey(
        "app.User", on_delete=models.CASCADE, related_name="notes"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    folder = models.ForeignKey(
        "app.Folder", on_delete=models.CASCADE, related_name="notes"
    )
    tags = models.ManyToManyField("app.Tag", related_name="notes")
    is_deleted = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("title", "is_deleted", "author"),
                name="unique_note_name_per_user",
            )
        ]
