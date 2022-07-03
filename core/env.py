import os
import environ

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# Take environment variables from .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

env = environ.Env(
    
)