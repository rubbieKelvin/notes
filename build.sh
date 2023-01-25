#!/usr/bin/env bash
# exist on error
set -o errexit

poetry install

python manage.py collectstatic --no-input
python manage.py migrate