import uuid
from django.db import models


def upload_to(instance: models.Model, filename: str) -> str:
    return f".bucket/opennotes/images/${uuid.uuid4().__str__()}"


class Upload(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    file = models.ImageField(upload_to=upload_to)
    author = models.ForeignKey("api.User", on_delete=models.CASCADE)
    note = models.ForeignKey(
        "api.Note", on_delete=models.CASCADE, related_name="uploads"
    )
    date_uploaded = models.DateTimeField(auto_now_add=True)
