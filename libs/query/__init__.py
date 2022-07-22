import json
from json.decoder import JSONDecodeError
from django.db.models import Q
from typing import Callable, TypeVar
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from json import loads
from json.decoder import JSONDecodeError

T = TypeVar('T', dict, list)


RELATIONSHIPS = dict(
    AND="_and",
    OR="_or",
    NOT="_not"
)

EXPRS = dict(
    EQUALS="_eq",
    NOT_EQUALS="_neq",
    IS_NULL="_null",
    GREATER_THAN="_gt",
    GREATER_THAN_OR_EQUALS="_gte",
    LESS_THAN="_lt",
    LESS_THAN_OR_EQUALS="_lte",
    IN="_in",
    NOT_IN="_nin",
    CONTAINS="_contains",
    INSENSITIVE_CONTAINS="_icontains",
    REGEX="_regex"
)

RAW_QUERY_MAPPING = {
    EXPRS["EQUALS"]: dict(negate=False, ext=""),
    EXPRS["NOT_EQUALS"]: dict(negate=True, ext=""),
    EXPRS["IS_NULL"]: dict(negate=False, ext="__isnull"),
    EXPRS["GREATER_THAN"]: dict(negate=False, ext="__gt"),
    EXPRS["GREATER_THAN_OR_EQUALS"]: dict(negate=False, ext="__gte"),
    EXPRS["LESS_THAN"]: dict(negate=False, ext="__lt"),
    EXPRS["LESS_THAN_OR_EQUALS"]: dict(negate=False, ext="__lte"),
    EXPRS["IN"]: dict(negate=False, ext="__in"),
    EXPRS["NOT_IN"]: dict(negate=True, ext="__in"),
    EXPRS["CONTAINS"]: dict(negate=False, ext="__contains"),
    EXPRS["INSENSITIVE_CONTAINS"]: dict(negate=False, ext="__icontains"),
    EXPRS["REGEX"]: dict(negate=False, ext="__regex"),
}

RELATIONSHIP_QUERY_MAPING = {
    RELATIONSHIPS["AND"]: lambda parent, value: and_rel(parse_query(value, parent=parent, join=False)),
    RELATIONSHIPS["OR"]: lambda parent, value: or_rel(parse_query(value, parent=parent, join=False)),
    RELATIONSHIPS["NOT"]: lambda parent, value: ~and_rel(
        parse_query(value, parent=parent, join=False))
}


def relation(queries: list[Q], bonder: Callable[[Q, Q], Q]) -> Q:
    if not queries:
        return None
    res = queries[0]
    for q in queries[1:]:
        res = bonder(res, q)
    return res


def and_rel(queries: list[Q]) -> Q:
    return relation(queries, lambda a, b: a & b)


def or_rel(queries: list[Q]) -> Q:
    return relation(queries, lambda a, b: a | b)

# TODO: write tests


def parse_query(query: dict, parent: str | None = None, join: bool = True) -> Q | list[Q]:
    """ Parses a dictionary into django.db.models.Q class
    """
    res = []
    for key, val in query.items():

        if key in EXPRS.values():
            r_map = RAW_QUERY_MAPPING[key]
            resultant_query = Q(**{f'{parent}{r_map["ext"]}': val})
            res.append((~resultant_query)
                       if r_map['negate'] else resultant_query)
        elif key in RELATIONSHIPS.values():
            rel = RELATIONSHIP_QUERY_MAPING[key]
            res.append(rel(parent, val))
        else:
            root = f'{parent}__{key}' if (
                parent and not parent.startswith('_')) else key
            res.append(parse_query(val, parent=root, join=True))
    return and_rel(res) if join else res


def get_query(request: Request) -> Q:
    query = request.query_params.get('query', '')
    if not query: return Q()

    try:
        query = json.loads(query)
        if type(query) == dict:
            return parse_query(query)
        return Q()
    except JSONDecodeError:
        return Q()


def pick(obj: dict, struct: dict) -> dict:
    """selects specific keys and value from obj based on structures in struct"""
    res = dict()
    for key, value in struct.items():
        if type(value) == bool:
            if value:
                res[key] = obj.get(key)
        elif type(value) == dict:
            obj_val = obj.get(key, {})
            if type(obj_val) == dict:
                res[key] = pick(obj_val, value)
            elif type(obj_val) == list:
                res[key] = [pick(i, value) for i in obj_val]
            else:
                raise TypeError
        else:
            raise TypeError
    return res


def request_pick(request: Request, data: T) -> T:
    dataselect = request.query_params.get('select', '').strip()
    if not dataselect:
        return data

    try:
        struct = loads(dataselect)
        if type(data) == dict:
            return pick(data, struct)
        elif type(data) == list:
            return [pick(item, struct) for item in data]
        else:
            print(type(data[0]))
            raise TypeError('only use dict|list')
    except JSONDecodeError:
        return data


class StructSelectPagination(PageNumberPagination):
    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'results': request_pick(self.request, list(data))
        })
