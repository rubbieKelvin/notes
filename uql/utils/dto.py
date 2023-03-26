# data transfer objects
import re
import typing
from django.db import models


class Rule:
    def __init__(self, _name: str = "value", nullable: bool = True) -> None:
        self.name = _name  # just a name to go by when reporting errors
        self.nullable = nullable  #: the value to be checked could be None

    def validate(self, other: typing.Any) -> None:
        pass

    def toJson(self) -> dict[str, typing.Any]:
        return {"name": self.name, "nullable": self.nullable, "type": "base"}


class String(Rule):
    def __init__(
        self,
        _name: str = "value",
        nullable: bool = False,
        min_length: int | None = None,
        max_length: int | None = None,
        allow_whitespace: bool = True,
        allow_numeric: bool = True,
        allow_special_characters: bool = True,
        allow_uppercase: bool = True,
        allow_lowercase: bool = True,
        pattern: str | None = None,
        validators: list[typing.Callable[[str], bool]] | None = None,
    ) -> None:
        """A data transfer object class for validating string values.

        Args:
            _name (str): A name to go by when reporting errors.
            nullable (bool): Whether the string value can be `None`.
            min_length (int): The minimum length of the string value.
            max_length (int): The maximum length of the string value.
            validators (List[Callable[[str], bool]]): A list of functions that perform additional validation checks on the string value.
            allow_whitespace (bool): Whether whitespace characters are allowed in the string value.
            allow_numeric (bool): Whether numeric characters are allowed in the string value.
            allow_special_characters (bool): Whether special characters are allowed in the string value.
            allow_uppercase (bool): Whether uppercase characters are allowed in the string value.
            allow_lowercase (bool): Whether lowercase characters are allowed in the string value.
            pattern (str): A regular expression pattern that the string value must match.

        Raises:
            ValueError: If the string value is invalid.
        """
        super().__init__(nullable=nullable, _name=_name)
        self.min_length = min_length
        self.max_length = max_length
        self.validators = validators or []
        self.allow_whitespace = allow_whitespace
        self.allow_numeric = allow_numeric
        self.allow_special_characters = allow_special_characters
        self.allow_uppercase = allow_uppercase
        self.allow_lowercase = allow_lowercase
        self.pattern = pattern

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "string",
            "name": self.name,
            "nullable": self.nullable,
            "min_length": self.min_length,
            "max_length": self.max_length,
            "allow_whitespace": self.allow_whitespace,
            "allow_numeric": self.allow_numeric,
            "allow_special_characters": self.allow_special_characters,
            "allow_uppercase": self.allow_uppercase,
            "allow_lowercase": self.allow_lowercase,
            "pattern": self.pattern,
        }

    def validate(self, other: str | None) -> None:
        """Validates the string value against the specified rules.

        Args:
            other (str): The string value to be validated.

        Raises:
            ValueError: If the string value is invalid.
        """
        if other is None:
            if not self.nullable:
                raise ValueError(
                    "{self.name} is None but nullable flag is set to False"
                )
        else:
            if not isinstance(other, str):
                raise ValueError(f"{self.name} is not a valid string")

            if self.min_length is not None and len(other) < self.min_length:
                raise ValueError(
                    f"{self.name} '{other}' is shorter than the minimum length of {self.min_length}"
                )
            if self.max_length is not None and len(other) > self.max_length:
                raise ValueError(
                    f"{self.name} '{other}' is longer than the maximum length of {self.max_length}"
                )
            if not self.allow_whitespace and any(c.isspace() for c in other):
                raise ValueError(
                    f"{self.name} '{other}' contains whitespace characters but allow_whitespace flag is set to False"
                )
            if not self.allow_numeric and any(c.isnumeric() for c in other):
                raise ValueError(
                    f"{self.name} '{other}' contains numeric characters but allow_numeric flag is set to False"
                )
            if not self.allow_special_characters and any(
                not c.isalnum() for c in other
            ):
                raise ValueError(
                    f"{self.name} '{other}' contains special characters but allow_special_characters flag is set to False"
                )
            if not self.allow_uppercase and any(c.isupper() for c in other):
                raise ValueError(
                    f"{self.name} '{other}' contains uppercase characters but allow_uppercase flag is set to False"
                )
            if not self.allow_lowercase and any(c.islower() for c in other):
                raise ValueError(
                    f"{self.name} '{other}' contains lowercase characters but allow_lowercase flag is set to False"
                )
            if self.pattern is not None and not re.match(self.pattern, other):
                raise ValueError(
                    f"{self.name} '{other}' does not match the required pattern"
                )
            for validator in self.validators:
                if not validator(other):
                    raise ValueError(f"{self.name} '{other}' failed validation")


class Number(Rule):
    """A data transfer object class for validating numeric values.

    Args:
        _name (str): A name to go by when reporting errors.
        nullable (bool): Whether the numeric value can be `None`.
        minimum (int|float|None): The minimum allowed value for the numeric value.
        maximum (int|float|None): The maximum allowed value for the numeric value.
        validators (List[Callable[[int|float], bool]]): A list of functions that perform additional validation checks on the numeric value.
        integer_only (bool): Whether the numeric value must be an integer.

    Raises:
        ValueError: If the numeric value is invalid.
    """

    def __init__(
        self,
        _name="value",
        nullable: bool = False,
        minimum: int | float | None = None,
        maximum: int | float | None = None,
        validators: list[typing.Callable[[int | float], bool]] | None = None,
        integer_only: bool = False,
    ) -> None:
        super().__init__(nullable=nullable, _name=_name)
        self.minimum = minimum
        self.maximum = maximum
        self.validators = validators or []
        self.integer_only = integer_only

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "number",
            "name": self.name,
            "nullable": self.nullable,
            "minimum": self.minimum,
            "maximum": self.maximum,
            "integer_only": self.integer_only,
        }

    def validate(self, other: int | float | None) -> None:
        """Validates the numeric value against the specified rules.

        Args:
            other (int|float|None): The numeric value to be validated.

        Raises:
            ValueError: If the numeric value is invalid.
        """
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        else:
            if not isinstance(other, (int, float)):
                raise ValueError(f"{self.name} is not a number value")

            if self.minimum is not None and other < self.minimum:
                raise ValueError(
                    f"{self.name}: {other} is less than the minimum value of {self.minimum}"
                )
            if self.maximum is not None and other > self.maximum:
                raise ValueError(
                    f"{self.name}: {other} is greater than the maximum value of {self.maximum}"
                )
            if self.integer_only and not isinstance(other, int):
                raise ValueError(
                    f"{self.name}: {other} is not an integer but integer_only flag is set to True"
                )
            for validator in self.validators:
                if not validator(other):
                    raise ValueError(f"{self.name}: {other} failed validation")


class Boolean(Rule):
    """A data transfer object class for validating boolean values.

    Args:
        _name (str): A name to go by when reporting errors.
        nullable (bool): Whether the boolean value can be `None`.
        validators (List[Callable[[bool], bool]]): A list of functions that perform additional validation checks on the boolean value.

    Raises:
        ValueError: If the boolean value is invalid.
    """

    def __init__(
        self,
        _name: str = "value",
        nullable: bool = False,
    ) -> None:
        super().__init__(_name=_name, nullable=nullable)

    def toJson(self) -> dict[str, typing.Any]:
        return {"type": "boolean", "name": self.name, "nullable": self.nullable}

    def validate(self, other: bool | None) -> None:
        """Validates the boolean value against the specified rules.

        Args:
            other (bool|None): The boolean value to be validated.

        Raises:
            ValueError: If the boolean value is invalid.
        """
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        else:
            if not isinstance(other, bool):
                raise ValueError(f"{self.name} is not a valid boolean value")


class Dictionary(Rule):
    """A data transfer object class for validating dictionary values.

    Args:
        _name (str): A name to go by when reporting errors.
        nullable (bool): Whether the dictionary value can be `None`.
        rules (Dict[Any, Type[Rule]]): A dictionary mapping keys to validation rules for the corresponding values.
        allow_unknown_keys (bool): Whether the dictionary is allowed to have keys that are not covered by the rules.
        min_length (int): The minimum number of key-value pairs in the dictionary.
        max_length (int): The maximum number of key-value pairs in the dictionary.

    Raises:
        ValueError: If the dictionary value is invalid.
    """

    def __init__(
        self,
        rules: dict[str, Rule] | None = None,
        _name: str = "value",
        nullable: bool = False,
        allow_unknown_keys: bool = False,
        min_length: int | None = None,
        max_length: int | None = None,
    ) -> None:
        super().__init__(_name=_name, nullable=nullable)
        self.rules = rules or {}
        self.allow_unknown_keys = allow_unknown_keys
        self.min_length = min_length
        self.max_length = max_length

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "dictionary",
            "rules": {key: rule.toJson() for key, rule in self.rules.items()},
            "name": self.name,
            "nullable": self.nullable,
            "allow_unknown_keys": self.allow_unknown_keys,
            "min_length": self.min_length,
            "max_length": self.max_length,
        }

    def add_rules(self, rules: dict[str, Rule]) -> None:
        """Adds additional validation rules to the dictionary.

        Args:
            rules (Dict[Any, Type[Rule]]): A dictionary mapping keys to validation rules for the corresponding values.
        """
        self.rules.update(rules)

    def validate(self, other: dict[str, typing.Any] | None) -> None:
        """Validates the dictionary value against the specified rules.

        Args:
            other (dict): The dictionary value to be validated.

        Raises:
            ValueError: If the dictionary value is invalid.
        """
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        elif not isinstance(other, dict):
            raise ValueError(f"{self.name} is not a dictionary")

        else:
            if self.min_length is not None and len(other) < self.min_length:
                raise ValueError(
                    f"{self.name} has {len(other)} key-value pairs, which is less than the minimum of {self.min_length}"
                )
            if self.max_length is not None and len(other) > self.max_length:
                raise ValueError(
                    f"{self.name} has {len(other)} key-value pairs, which is more than the maximum of {self.max_length}"
                )
            if not self.allow_unknown_keys:
                unknown_keys = set(other.keys()) - set(self.rules.keys())
                if unknown_keys:
                    raise ValueError(f"{self.name} has unknown keys: {unknown_keys}")

            for key, rule in self.rules.items():
                rule.name = f"{self.name}.{key}"
                rule.validate(other.get(key))


class List(Rule):
    """A validation rule for lists.

    This class extends the `Rule` class and allows for validation of lists. It takes an `element_rule` argument, which is a
    validation rule that should be applied to each element in the list. It also has `nullable`, `min_length`, and `max_length`
    flags that work similarly to the flags in the `Dictionary` class. The `validate` method checks that the `other` value is
    a list, then checks the `min_length` and `max_length` flags, and finally iterates through the list and validates each
    element using the `element_rule` provided.

    Examples:
        >>> List(
        ...     String(min_length=3),
        ...     min_length=2,
        ...     max_length=3,
        ... ).validate(["hello", "world"])
        >>> List(
        ...     String(min_length=3),
        ...     min_length=2,
        ...     max_length=3,
        ... ).validate(["hello", "world", "longer"])
        ValueError: value has 3 elements, which is more than the maximum of 3
        >>> List(
        ...     String(min_length=3),
        ...     min_length=2,
        ...     max_length=3,
        ... ).validate(["hi"])
        ValueError: value has 1 elements, which is less than the minimum of 2

    Args:
        element_rule (Rule): A validation rule that should be applied to each element in the list.
        _name (str, optional): The name of the value being validated. Defaults to "value".
        nullable (bool, optional): Whether or not the value being validated can be None. Defaults to False.
        min_length (int, optional): The minimum number of elements that the list should have. If not provided, there is no
            minimum length.
        max_length (int, optional): The maximum number of elements that the list should have. If not provided, there is no
            maximum length."""

    def __init__(
        self,
        element_rule: Rule,
        _name: str = "value",
        nullable: bool = False,
        min_length: int | None = None,
        max_length: int | None = None,
    ) -> None:
        super().__init__(_name=_name, nullable=nullable)
        self.element_rule = element_rule
        self.min_length = min_length
        self.max_length = max_length

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "list",
            "element_rule": self.element_rule.toJson(),
            "name": self.name,
            "nullable": self.nullable,
            "min_length": self.min_length,
            "max_length": self.max_length,
        }

    def validate(self, other: list[typing.Any] | None) -> None:
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        elif not isinstance(other, list):
            raise ValueError(f"{self.name} is not a list")

        else:
            if self.min_length is not None and len(other) < self.min_length:
                raise ValueError(
                    f"{self.name} has {len(other)} elements, which is less than the minimum of {self.min_length}"
                )
            if self.max_length is not None and len(other) > self.max_length:
                raise ValueError(
                    f"{self.name} has {len(other)} elements, which is more than the maximum of {self.max_length}"
                )

            for i, element in enumerate(other):
                self.element_rule.name = f"{self.name}[{i}]"
                self.element_rule.validate(element)


class Any(Rule):
    """A validation rule that requires the value being compared against to pass at least one of the provided rules.

    This class extends the `Rule` class and allows for validation of values that must pass at least one of a provided list of
    rules. It takes a `rules` argument, which is a list of validation rules that the value being compared against must pass at
    least one of. It also has a `nullable` flag that works similarly to the flag in the other `Rule` classes. The `validate`
    method iterates through the list of rules and attempts to validate the value against each one. If the value passes at least
    one of the rules, the method returns without raising an error. If the value fails all of the rules, a `ValueError` is
    raised.

    Examples:
        >>> Any(
        ...     [String(min_length=3), String(max_length=5)],
        ... ).validate("hello")
        >>> Any(
        ...     [String(min_length=3), String(max_length=5)],
        ... ).validate("hi")
        ValueError: value is a string with length 2, which does not meet any of the provided rules
        >>> Any(
        ...     [String(min_length=3), String(max_length=5)],
        ...     nullable=True,
        ... ).validate(None)
        >>> Any().validate(0)
        >>> Any().validate(True)
        >>> Any().validate("hi")

    Args:
        rules (List[Rule], optional): A list of validation rules that the value being compared against must pass at least one of.
        _name (str, optional): The name of the value being validated. Defaults to "value".
        nullable (bool, optional): Whether or not the value being validated can be None. Defaults to False.
    """

    def __init__(
        self,
        rules: list[Rule] | None = None,
        _name: str = "value",
        nullable: bool = False,
    ) -> None:
        super().__init__(_name=_name, nullable=nullable)
        self.rules = rules or []
        assert (
            len(self.rules) > 1 or len(self.rules) == 0
        ), "Two rules, or None are required to use this class"

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "any",
            "rules": [rule.toJson() for rule in self.rules],
            "name": self.name,
            "nullable": self.nullable,
        }

    def validate(self, other: typing.Any | None) -> None:
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        else:
            if not self.rules:
                # if no rules where given just pass
                return

            for rule in self.rules:
                # this class is just an abstract, so let's name it's children it's own name
                rule.name = self.name

                try:
                    rule.validate(other)
                    return  # value passed at least one rule, so we can return
                except ValueError:
                    pass
            raise ValueError(f"{self.name} does not meet any of the provided rules")


class Model(Rule):
    def __init__(
        self,
        model: type[models.Model],
        field: str,
        _name: str = "value",
        nullable: bool = False,
        filter: models.Q | None = None,
    ) -> None:
        super().__init__(_name=_name, nullable=nullable)
        self.model = model
        self.field = field
        self.filter = filter

    def toJson(self) -> dict[str, typing.Any]:
        return {
            "type": "django.db.models.Model",
            "model": self.model._meta.label_lower,
            "field": self.field,
            "name": self.name,
            "nullable": self.nullable,
            "filter": str(self.filter),
        }

    def validate(self, other: typing.Any | None) -> None:
        if other is None:
            if not self.nullable:
                raise ValueError(
                    f"{self.name} is None but nullable flag is set to False"
                )
        else:
            try:
                columns = (
                    self.model.objects.filter(self.filter)
                    if self.filter
                    else self.model.objects.all()
                )
                columns.get(**{self.field: other})
            except self.model.DoesNotExist:
                raise ValueError(
                    f"{self.name} does not match any {self.model.__name__} records in the database"
                )


class NonNull(Rule):
    """
    A validation rule that ensures that a value is not `None`.

    Attributes:
        name (str): The name of the value being validated.
        nullable (bool): Whether the value is allowed to be `None`. Keep in mind, the value of nullable is ignored here

    Raises:
        ValueError: If the value is `None`.
    """

    def __init__(self, _name: str = "value") -> None:
        super().__init__(_name=_name, nullable=False)

    def validate(self, other: typing.Any) -> None:
        if other is None:
            raise ValueError(f"{self.name} should not be None.")

    def toJson(self) -> dict[str, typing.Any]:
        return {"type": "not-null", "name": self.name}
