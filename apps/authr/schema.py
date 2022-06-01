import graphene
from . import mutations

class Query(graphene.ObjectType):
    pass

class Mutation(graphene.ObjectType):
    create_user = mutations.CreateUser.Field()
