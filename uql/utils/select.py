from .typecheck import isMap
from .typecheck import isArray
from collections.abc import Mapping


def selectKeys(data: Mapping, structure: dict) -> dict:
    res = {}
    for key, val in structure.items():
        if not (key in data):
            raise KeyError(f"{key} doenst exist in root")

        if val:
            if isMap(data[key]):
                if isMap(val):
                    res[key] = selectKeys(data[key], val)
                else:
                    res[key] = data[key]
            elif isArray(data[key]):
                res[key] = [selectKeys(i, val) if isMap(val) else i for i in data[key]]
            else:
                res[key] = data[key]

    return res
