from json import loads
from json.decoder import JSONDecodeError

from typing import TypeVar

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

T = TypeVar('T', dict, list)


def keyPick(obj: dict, struct: dict) -> dict:
    """selects specific keys and value from obj based on structures in struct"""
    res = dict()
    for key, value in struct.items():
        if type(value) == bool:
            if value:
                res[key] = obj.get(key)
        elif type(value) == dict:
            obj_val = obj.get(key, {})
            if type(obj_val) == dict:
                res[key] = keyPick(obj_val, value)
            elif type(obj_val) == list:
                res[key] = [keyPick(i, value) for i in obj_val]
            else:
                raise TypeError
        else:
            raise TypeError
    return res


def keyPickFromRequestStruct(request: Request, data: T) -> T:
    dataselect = request.query_params.get('select', '').strip()
    if not dataselect:
        return data

    try:
        struct = loads(dataselect)
        if type(data) == dict:
            return keyPick(data, struct)
        elif type(data) == list:
            return [keyPick(item, struct) for item in data]
        else:
            raise TypeError('only use dict|list')
    except JSONDecodeError:
        return data


class KeyPickPageNumberPagination(PageNumberPagination):
    max_page_size = 100
    page_size = 30

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'results': keyPickFromRequestStruct(self.request, list(data))
        })
