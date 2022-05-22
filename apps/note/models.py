import uuid
from django.db import models

class Note(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True)
    ld = models.UUIDField(null=False)
    name = models.CharField(max_length=40, null=False)
    folder = models.CharField(max_length=999, default=None, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(null=False)
    last_backup = models.DateTimeField(auto_now=True),
    body = models.JSONField()
    private = models.BooleanField(default=True)
    author = models.ForeignKey('users.User', on_delete=models.CASCADE)
    public_slug = models.SlugField(null=True)
