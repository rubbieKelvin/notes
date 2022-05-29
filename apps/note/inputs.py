import graphene

class NoteInput(graphene.InputObjectType):
    ld = graphene.UUID(required=True)
    name = graphene.String(required=True)
    folder = graphene.String(required=True)
    last_edited = graphene.DateTime(required=True)
    body = graphene.JSONString(required=True)
    private = graphene.Boolean(required=True)
    created_at = graphene.DateTime()
    id = graphene.UUID()
