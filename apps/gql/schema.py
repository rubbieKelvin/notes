import graphene
from apps.note.schema import Query as NoteQuery
from apps.users.schema import Query as UserQuery

class Query(NoteQuery, UserQuery):
    pass

schema = graphene.Schema(query=Query)
