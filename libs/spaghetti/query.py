import json
from json.decoder import JSONDecodeError

from django.db.models import Q
from typing import Callable, TypeVar
from rest_framework.request import Request
from libs.spaghetti import constants

T = TypeVar('T', dict, list)


RELATIONSHIP_QUERY_MAPING = {
    constants.QUERY_UNIONS["AND"]: lambda parent, value: _and_rel(mapQ(value, parent=parent, join=False)),
    constants.QUERY_UNIONS["OR"]: lambda parent, value: _or_rel(mapQ(value, parent=parent, join=False)),
    constants.QUERY_UNIONS["NOT"]: lambda parent, value: ~_and_rel(
        mapQ(value, parent=parent, join=False))
}


def _relation(queries: list[Q], bonder: Callable[[Q, Q], Q]) -> Q:
    if not queries:
        return None
    res = queries[0]
    for q in queries[1:]:
        res = bonder(res, q)
    return res

def _and_rel(queries: list[Q]) -> Q:
    return _relation(queries, lambda a, b: a & b)

def _or_rel(queries: list[Q]) -> Q:
    return _relation(queries, lambda a, b: a | b)


def mapQ(query: dict, parent: str | None = None, join: bool = True) -> Q | list[Q]:
    """ Parses a dictionary into django.db.models.Q class
    """
    res = []
    for key, val in query.items():

        if key in constants.QUERY_RELATIONSHIPS.values():
            r_map = constants.RAW_QUERY_MAPPING[key]
            resultant_query = Q(**{f'{parent}{r_map["ext"]}': val})
            res.append((~resultant_query)
                       if r_map['negate'] else resultant_query)
        elif key in constants.QUERY_UNIONS.values():
            rel = RELATIONSHIP_QUERY_MAPING[key]
            res.append(rel(parent, val))
        else:
            root = f'{parent}__{key}' if (
                parent and not parent.startswith('_')) else key
            res.append(mapQ(val, parent=root, join=True))
    return _and_rel(res) if join else res


# TODO: added a way to manage specific key permissions, maybe with exclude keys for certain conditions
def requestMapQuery(request: Request) -> Q:
    query = request.query_params.get('query', '')
    if not query: return Q()

    try:
        query = json.loads(query)
        if type(query) == dict:
            return mapQ(query)
    except JSONDecodeError:
        pass
    return Q()
