import graphene
from . import mutations

class Mutation(graphene.ObjectType):
    upload_note = mutations.UploadNote.Field()
