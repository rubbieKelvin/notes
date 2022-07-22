QUERY_UNIONS = dict(
    AND="_and",
    OR="_or",
    NOT="_not"
)

QUERY_RELATIONSHIPS = dict(
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
    QUERY_RELATIONSHIPS["EQUALS"]: dict(negate=False, ext=""),
    QUERY_RELATIONSHIPS["NOT_EQUALS"]: dict(negate=True, ext=""),
    QUERY_RELATIONSHIPS["IS_NULL"]: dict(negate=False, ext="__isnull"),
    QUERY_RELATIONSHIPS["GREATER_THAN"]: dict(negate=False, ext="__gt"),
    QUERY_RELATIONSHIPS["GREATER_THAN_OR_EQUALS"]: dict(negate=False, ext="__gte"),
    QUERY_RELATIONSHIPS["LESS_THAN"]: dict(negate=False, ext="__lt"),
    QUERY_RELATIONSHIPS["LESS_THAN_OR_EQUALS"]: dict(negate=False, ext="__lte"),
    QUERY_RELATIONSHIPS["IN"]: dict(negate=False, ext="__in"),
    QUERY_RELATIONSHIPS["NOT_IN"]: dict(negate=True, ext="__in"),
    QUERY_RELATIONSHIPS["CONTAINS"]: dict(negate=False, ext="__contains"),
    QUERY_RELATIONSHIPS["INSENSITIVE_CONTAINS"]: dict(negate=False, ext="__icontains"),
    QUERY_RELATIONSHIPS["REGEX"]: dict(negate=False, ext="__regex"),
}

class ERRORS:
    INVALID_REQUEST_BODY="INVALID_REQUEST_BODY"
