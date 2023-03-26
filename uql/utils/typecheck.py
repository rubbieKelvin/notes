from collections.abc import Sequence
from collections.abc import Mapping


def isArray(x) -> bool:
    return isinstance(x, Sequence) and type(x) != str


def isMap(x) -> bool:
    return isinstance(x, Mapping)
