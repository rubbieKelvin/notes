from uuid import uuid4
from django.db import models


class Tag(models.Model):
    id = models.UUIDField(default=uuid4, primary_key=True, editable=False)
    title = models.CharField(max_length=30, null=False)
    description = models.CharField(max_length=100, default=None)
    author = models.ForeignKey(
        "api.User", on_delete=models.CASCADE, related_name="tags"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    color = models.CharField(max_length=7, default=None)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["title", "author"],
                condition=models.Q(is_deleted=False),
                name="uniqe_tag_name_per_user",
            )
        ]


class TagMembership(models.Model):
    id = models.UUIDField(default=uuid4, primary_key=True, editable=False)
    tag = models.ForeignKey(
        "Tag", on_delete=models.CASCADE, related_name="note_attachments"
    )
    note = models.ForeignKey(
        "api.Note", on_delete=models.CASCADE, related_name="tag_attachments"
    )
    is_deleted = models.BooleanField(default=False)
