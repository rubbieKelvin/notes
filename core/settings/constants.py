import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
# By defaut DEBUG is one, set DEBUG to 0 to turn off
DEBUG = os.getenv("DEBUG", '1') == '1'

_devmode = os.getenv('DEVELOPMENT_MODE', 'dev').lower()

class DevelopmentMode:
    DEV = _devmode in [None, 'dev']
    PROD = _devmode == 'prod'
    