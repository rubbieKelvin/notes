# This script defines a function makeQuery that takes in a dictionary
# representing a search query, and returns a Django Q object that can be used to filter
# a queryset. The search query dictionary can contain nested dictionaries,
# and the keys in the dictionaries correspond to various types of search criteria,
# including equality checks, inequality checks, range checks, and membership checks.
# These criteria are represented using special keywords,
# such as _eq, _gt, _gte, _lt, _lte, _in, _nin, _contains, _icontains, _regex, _or, _and,
# and _not, which are stored in a dictionary.
# The makeQuery function recursively traverses the search query dictionary,
# using the critaroin dictionary to identify the type of each criterion
# and to create the appropriate Django Q object for that criterion.
# If a key in the search query dictionary does not correspond to a criterion,
# it is treated as a field name and the search continues recursively on its corresponding value.
# The Q objects created for each criterion are then combined using the _or
# and _and conjunctions, or negated using the _not conjunction,
# to create the final Q object that represents the entire search query.

import typing
from functools import reduce
from django.db.models import Q
from collections.abc import Sequence


ConjunctionTypes: typing.TypeAlias = (
    typing.Literal["_or"] | typing.Literal["_and"] | typing.Literal["_not"]
)
CriterionTypes: typing.TypeAlias = (
    typing.Literal["_eq"]
    | typing.Literal["_neq"]
    | typing.Literal["_gt"]
    | typing.Literal["_gte"]
    | typing.Literal["_lt"]
    | typing.Literal["_lte"]
    | typing.Literal["_in"]
    | typing.Literal["_nin"]
    | typing.Literal["_contains"]
    | typing.Literal["_icontains"]
    | typing.Literal["_regex"]
)


class Criterion:
    def __init__(self, name: CriterionTypes, djtype: str, negate=False) -> None:
        """Direct relation between a key and it's value"""
        self.name = name
        self.djtype = djtype
        self.negate = negate

    def resolve(self, key: str, value: typing.Any) -> Q:
        if self.name in [
            "_eq",
            "_neq",
            "_gt",
            "_gte",
            "_lt",
            "_lte",
            "_in",
            "_nin",
            "_contains",
            "_icontains",
            "_regex",
        ]:
            res = Q(**{f"{key}{self.djtype}": value})
            return ~res if self.negate else res
        raise ValueError(f"Invalid criterion")


class Conjunction:
    def __init__(
        self, name: ConjunctionTypes, resolve: typing.Callable[[list[Q]], Q]
    ) -> None:
        """Relationship between many values"""
        self.name = name
        self.resolve = resolve


# create relationships
criterions: dict[CriterionTypes, Criterion] = {
    "_eq": Criterion("_eq", ""),
    "_neq": Criterion("_neq", "", negate=True),
    "_gt": Criterion("_gt", "__gt"),
    "_gte": Criterion("_gte", "__gte"),
    "_lt": Criterion("_lt", "__lt"),
    "_lte": Criterion("_lte", "__lte"),
    "_in": Criterion("_in", "__in"),
    "_nin": Criterion("_nin", "__in", negate=True),
    "_contains": Criterion("_contains", "__contains"),
    "_icontains": Criterion("_icontains", "__icontains"),
    "_regex": Criterion("_regex", "__regex"),
}

# create conjunctions
conjunctions: dict[ConjunctionTypes, Conjunction] = {
    "_or": Conjunction("_or", lambda items: reduce(lambda a, b: a | b, items)),
    "_and": Conjunction("_and", lambda items: reduce(lambda a, b: a & b, items)),
    "_not": Conjunction("_not", lambda items: ~reduce(lambda a, b: a & b, items)),
}


class QueryStructureError(BaseException):
    pass


# make query func
# TODO: cache function
def makeQuery(query: dict[str, typing.Any], **kwargs: str) -> Q:
    # Get parent field name, if any
    parent: str = kwargs.get("parent", "")

    # Initialize list to store Q objects for each criterion
    res: list[Q] = []

    try:
        for item, value in query.items():
            # check if item is a criterion or conjunction
            criterion = criterions.get(typing.cast(CriterionTypes, item))
            conjunction = conjunctions.get(typing.cast(ConjunctionTypes, item))

            if criterion:
                # If item is a criterion, resolve it and add the resulting Q object to the list
                res.append(criterion.resolve(parent, value))

            elif conjunction:
                # If item is a conjunction, recursively resolve its values and combine them using the conjunction
                assert isinstance(value, Sequence)
                res.append(
                    conjunction.resolve([makeQuery(i, parent=parent) for i in value])
                )

            else:
                # If item is not a criterion or conjunction, treat it as a field name and recursively resolve its value
                res.append(
                    makeQuery(value, parent=f"{parent}__{item}" if parent else item)
                )

        # Combine all Q objects using the _and conjunction
        return reduce(lambda a, b: a & b, res)
    except AttributeError:
        raise QueryStructureError(
            f'expected a citarion or relationship, got a string "{query}"', 400
        )
