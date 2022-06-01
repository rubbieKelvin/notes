import graphene

class Query(graphene.ObjectType):
    version = graphene.String(default_value="v0.1.0")

schema = graphene.Schema(query=Query)
