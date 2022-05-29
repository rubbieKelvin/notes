import uuid
from datetime import datetime
from django.db import models
from django.utils import timezone
from apps.users.models import User # TODO: remove

def default_note_body():
    return dict(type='doc', content=[])


class Note(models.Model):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True, unique=True)
    ld = models.UUIDField(null=False)
    name = models.CharField(max_length=40, null=False)
    folder = models.CharField(
        max_length=999, default=None, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(null=False)
    last_backup = models.DateTimeField(auto_now=True),
    body = models.JSONField(default=default_note_body)
    private = models.BooleanField(default=True)
    author = models.ForeignKey('users.User', on_delete=models.CASCADE)
    public_slug = models.SlugField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.ld.__str__()[:8]}...)"

    @staticmethod
    def upload(
        ld: uuid.UUID,
        name: str,
        folder: str,
        last_edited: datetime,
        body: dict,
        private: bool = True,
        created_at: datetime | None = None,
        id: uuid.UUID | None = None,
    ):
        # if id is null, we're uploading the note
        if id==None:
            note = Note(
                ld=ld,
                name=name,
                folder=folder,
                last_edited=last_edited,
                body=body,
                private=private,
                created_at=created_at or timezone.now(),
            )
        else:
            note:Note = Note.objects.get(id=id, ld=ld)
            note.name = name
            note.folder = folder
            note.last_edited = last_edited
            note.body = body
            note.private = private

        note.author = User.objects.first() #TODO: remove
        note.save()
        return note


class File(models.Model):
    note = models.ForeignKey('Note', on_delete=models.CASCADE)
    file = models.FileField(upload_to='u/')


class NoteShare(models.Model):
    note = models.ForeignKey('Note', on_delete=models.CASCADE)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
