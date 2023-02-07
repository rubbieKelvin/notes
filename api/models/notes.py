from uuid import uuid4
from django.db import models


def defaultContent():
    return {"content": [{"type": "paragraph"}], "type": "doc"}


class Note(models.Model):
    id = models.UUIDField(default=uuid4, primary_key=True)
    title = models.CharField(max_length=60, null=False)
    content = models.JSONField(default=defaultContent)
    readable_id = models.BigIntegerField(null=True, default=None, blank=True)
    author = models.ForeignKey(
        "api.User", on_delete=models.CASCADE, related_name="notes"
    )
    date_created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_starred = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)  # perm delete
    is_trashed = models.BooleanField(default=False)  # temp delete
    is_archived = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.readable_id == None:
            count = Note.objects.filter(author=self.author).count()
            self.readable_id = count + 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.author.username}/NOTE-{self.readable_id} {self.title}"
