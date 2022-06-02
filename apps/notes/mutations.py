import graphene
from . import inputs
from . import types
from . import models

class UploadNote(graphene.Mutation):
    note = graphene.Field(types.NoteType)

    class Arguments:
        note = inputs.NoteStructure(required=True)

    def mutate(self, info, note):
        note = models.Note.upload(**note)
        return UploadNote(note=note)
