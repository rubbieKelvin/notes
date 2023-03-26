class RequestHandlingError(BaseException):
    def __init__(
        self,
        msg: str,
        errorCode: int | str | None = None,
        statusCode: int | None = None,
        summary: str | None = None,
    ) -> None:
        """_summary_

        Args:
            msg (str): Message describing cuase of error
            errorCode (str|int, optional): Standard cause of error (maybe an enum or constant) for devs to identify error. Defaults to None.
            statusCode (int, optional): Http status code. Defaults to None.
            summary (str, optional): Describes the issue and maybe outlines steps to fix
        """
        self.message = msg
        self.statusCode = statusCode or 500
        self.errorCode = errorCode
        self.summary = summary
        super().__init__(msg)

class InexistentExposedModel(BaseException):
    pass