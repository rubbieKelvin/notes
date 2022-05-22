import graphene
from graphql.execution.base import ResolveInfo
from graphene_django import DjangoObjectType
from apps.note.models import Note

class NoteType(DjangoObjectType):
    class Meta:
        model = Note

class Query(graphene.ObjectType):
    notes = graphene.List(NoteType)

    def resolve_notes(self, info:ResolveInfo):
        return Note.objects.all()
