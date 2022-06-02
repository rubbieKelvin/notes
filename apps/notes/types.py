from graphene_django import DjangoObjectType
from . import models

class NoteType(DjangoObjectType):
    class Meta:
        model = models.Note
        fields = "__all__"
