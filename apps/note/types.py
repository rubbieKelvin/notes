from . import models
from graphene_django import DjangoObjectType

class NoteType(DjangoObjectType):
    class Meta:
        model = models.Note
        fields = '__all__'


class NoteShareType(DjangoObjectType):
    class Meta:
        model = models.NoteShare
        fields = "__all__"


class FileType(DjangoObjectType):
    class Meta:
        model = models.File
        fields = '__all__'
