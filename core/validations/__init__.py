import re

def email(text: str) -> bool:
    if not text: return False
    regex = re.compile(r'([A-Za-z0-9]+[.-_])*[A-Za-z0-9]+@[A-Za-z0-9-]+(\.[A-Z|a-z]{2,})+')
    return bool(re.fullmatch(regex, text))

def password(text: str) -> bool:
    if not text: return False
    return len(text) > 5

