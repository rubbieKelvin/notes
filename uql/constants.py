INEXISTENT_INTENT = "UQL:INEXISTENT_INTENT"  # requested intent was not found
NO_INTENT = "UQL:NO_INTENT"  # intent wasn't passed on request
INVALID_REQUEST_HANDLER_OUTPUT = "UQL:INVALID_REQUEST_HANDLER_OUTPUT"  # output from intent handler is invalid; ie. not a list or dict or none
INVALID_REQUEST_BODY = "UQL:INVALID_REQUEST_BODY"
MISSING_REQUIRED_ARGUMENT = (
    "UQL:MISSING_REQUIRED_ARGUMENT"  # call to intents missing argument
)
DEFAULT_ON_REQUIRED_ARGS = (
    "UQL:DEFAULT_ON_REQUIRED_ARGS"  # required args should not have default values
)
UNKNOWN_ARGS = "UQL:UNKNOWN_ARGS"  # unknown argument in request
OBJECT_NOT_FOUND = "UQL:OBJECT_NOT_FOUND"


ALL_COLUMNS = "ALL_COLUMNS"
ALL_ROWS = "ALL_ROWS"
