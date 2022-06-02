import graphene
import graphql_jwt
from .authr.schema import Query as AuthrQuery
from .authr.schema import Mutation as AuthrMutation
from .notes.schema import Mutation as NotesMutation

class Query(AuthrQuery):
    version = graphene.String(default_value="v0.1.0")

class Mutation(AuthrMutation, NotesMutation):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    verify_token = graphql_jwt.Verify.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
