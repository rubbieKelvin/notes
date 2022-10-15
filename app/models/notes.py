from uuid import uuid4
from django.db import models


def slug_default(*args, **kawrgs):
    print(args, kawrgs)
    return None


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    title = models.CharField(max_length=50)
    slug = models.SlugField(null=True, default=slug_default)
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
            ),
            models.UniqueConstraint(
                fields=("slug", "is_deleted", "author"),
                name="unique_slug_per_user_note",
            ),
        ]
