import graphene

from apps.note.schema import Query as NoteQuery
from apps.note.schema import Mutation as NotesMutation

from apps.users.schema import Query as UserQuery
from apps.users.schema import Mutation as UserMutation

class Query(NoteQuery, UserQuery):
    pass


class Mutation(NotesMutation, UserMutation):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
