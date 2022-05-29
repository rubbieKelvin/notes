import graphene
from . import models
from . import inputs
from . import types

class UploadNote(graphene.Mutation):
    class Arguments:
        note = inputs.NoteInput(required=True)

    note = graphene.Field(types.NoteType)

    @classmethod
    def mutate(cls, root, info, note):
        new = models.Note.upload(**note)
        return UploadNote(note=new)
