import uuid
from django.db import models
from libs.mixins.model import ModelMixin
from typing_extensions import Self


class Note(models.Model, ModelMixin):
    id = models.UUIDField(default=uuid.uuid4, primary_key=True)
    name = models.CharField(max_length=60, null=False, blank=False)
    body = models.JSONField()
    private = models.BooleanField(default=True)
    author = models.ForeignKey('authr.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(auto_now=True)
    archived = models.BooleanField(default=False)
    slug = models.SlugField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['slug', 'author'], name='user_cant_have_dup_slugs')
        ]

    def __str__(self) -> str:
        return f"{self.author.email}/{self.slug}"

    @staticmethod
    def create(name: str, private: bool, author, slug:str=None, body:dict=None) -> Self:
        note = Note(
            name=name,
            private=private,
            author=author,
            body=body or dict(type='doc', content=[]),
            slug=slug or str(uuid.uuid4()),)

        note.save()
        return note

    @staticmethod
    def find(*queries: models.Q) -> models.QuerySet[Self]:
        return Note.objects.filter(*queries)

    def update(self, name:str|None=None, archived:bool|None=None, private:bool|None=None, slug:str|None=None, body:dict|None=None):
        self.name = name or self.name
        if private != None: self.private = private
        if archived != None: self.archived = archived
        self.slug = slug or self.slug
        self.body = body or self.body
        self.save()

    @staticmethod
    def all() -> models.QuerySet(Self):
        return Note.objects.all()

