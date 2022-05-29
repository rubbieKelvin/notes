import graphene
from graphene_django import DjangoObjectType
from . import models
from . import types
from . import mutation

class Query(graphene.ObjectType):
    note = graphene.Field(types.NoteType, id=graphene.ID(required=True))
    notes = graphene.List(types.NoteType)

    def resolve_note(self, info, id):
        return models.Note.objects.get(id=id)

    def resolve_notes(self, info):
        return models.Note.objects.all()


class Mutation(graphene.ObjectType):
    upload_note = mutation.UploadNote.Field()