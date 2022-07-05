from typing import Any, Callable

class Session:
    def __init__(self) -> None:
        self.error = ""
        self.valid = True
        self.typecalls: list[type_] = []

    @property
    def steps(self) -> int:
        return len(self.typecalls)

    
    def setinvalid(self, reason:str):
        self.error = reason
        self.valid = False

class type_:
    def __init__(self, validations: list[Callable[[Any], bool]]=[], optional:bool=False) -> None:
        self.validations = validations
        self.session = Session()
        self.optional = optional
        self.name = "value"

    def validate(self, value:Any) -> bool:
        self.session.typecalls.append(self)

        if self.optional and value==None: return True

        for validation in self.validations:
            if not validation(value):
                self.session.setinvalid(f"{self.name} is invalid")
                return False
        return True

class string(type_):
    def __init__(self, validations: list[Callable[[Any], bool]]=[], optional:bool=False) -> None:
        super().__init__(validations, optional)

    def validate(self, value: str) -> bool:
        if self.optional and value==None: return True
        if not super().validate(value): return False
        if type(value) != str:
            self.session.setinvalid(f"{self.name} should be a string")
            return False
        return True

class number(type_):
    def __init__(self, validations: list[Callable[[Any], bool]]=[], optional:bool=False) -> None:
        super().__init__(validations, optional)

    def validate(self, value: int|float) -> bool:
        if self.optional and value==None: return True
        if not super().validate(value): return False
        if not type(value) in [int, float]:
            self.session.setinvalid(f"{self.name} should be a number (int or float)")
            return False
        return True

class boolean(type_):
    def __init__(self, validations: list[Callable[[Any], bool]]=[], optional:bool=False) -> None:
        super().__init__(validations, optional)

    def validate(self, value: Any) -> bool:
        if self.optional and value==None: return True
        if not super().validate(value): return False
        if type(value) != bool:
            self.session.setinvalid(f"{self.name} should be a boolean")
            return False
        return True

class object_(type_):
    def __init__(self, value, optional:bool=False) -> None:
        super().__init__([], optional)
        self.typing = value

    def validate(self, value: dict) -> bool:
        if self.optional and value==None: return True
        if type(value) != dict or not super().validate(value):
            if self.session.valid:
                self.session.setinvalid(f"{self.name} should be an object")
            return False

        if not set(value.keys()).issubset(self.typing.keys()):
            extra = (set(value.keys()) - set(self.typing.keys())).pop()
            self.session.setinvalid(f"{self.name} has an unnecessary key \"{extra}\"")
            return False

        for k, v in self.typing.items():
            v: type_

            v.name = f"{self.name}[{k}]"
            v.session = self.session

            if not v.validate(value[k]):
                self.session.valid = False
                return False

        return True

class array(type_):
    def __init__(self, typing: type_, validations: list[Callable[[Any], bool]] = [], optional:bool=False) -> None:
        super().__init__(validations, optional)
        self.typing = typing

    def validate(self, value: list) -> bool:
        if self.optional and value==None: return True
        if type(value) != list and not super().validate(value):
            if self.session.valid:
                self.session.setinvalid(f"{self.name} should be an array")
            return False

        self.typing.session = self.session

        for item, index in enumerate(value):
            self.typing.name = f"self.name[{index}]"
            if not self.typing.validate(item):
                self.session.valid = False
                return False
        return True

class or_(type_):
    def __init__(self, typings: list[type_], validations: list[Callable[[Any], bool]] = [], optional: bool = False) -> None:
        super().__init__(validations, optional)
        self.typings = typings

    def validate(self, value: Any) -> bool:
        if not super().validate(value): return False
        for typing in self.typings:
            if typing.validate(value):
                return True
        return False

