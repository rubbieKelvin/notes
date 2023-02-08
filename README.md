# Notes

A dead-simple paper for keeping notes. Notes is a simple notes taking app that focuses on simplicity to reduce distractions.

> See Live app [here](https://opennotes.one/).

[![Made in Nigeria](https://img.shields.io/badge/made%20in-nigeria-008751.svg?style=flat-square)](https://github.com/acekyd/made-in-nigeria)

![screenshot](.screenshots/window.png)

## Notes?

- Simple and easy to use
- Extensible with editors (such as Markdown and Code)
- Open-source
- Distraction free and minimal ui

### Local Setup

This repo contains the core code used in the web app. to get started you'd need the following installed
- [Yarn](https://yarnpkg.com/getting-started/install)
- [NodeJs](https://nodejs.org/)
- [Python](https://python.org/)
- [Python Poetry](https://python-poetry.org/)
- [Git](https://git-scm.com/)

#### Clone project

```sh
git clone https://github.com/rubbieKelvin/notes.git # or 'git@github.com:rubbieKelvin/notes.git' for ssh
cd notes
```

#### Setup frontend

```sh
yarn              # install packages
yarn frontend     # run locally
```

#### Setup backend

```sh
# setup virtual env
python3 -m venv venv
source ./venv/bin/activate

# install requirements
poetry install

# run backend
yarn backend
```

If you have any issues installing pyscopg2 from the `poetry install step`, run this:

```sh
# debian based (Ubuntu, ...)
sudo apt install python3-dev libpq-dev

# or for red hat (Fedora, ...)
sudo dnf install python3-devel libpq-devel
```

then run the install step again

```sh
poetry install
```

> open your browser to `http://127.0.0.1:5173/` for the frontend server.
>
> Backend is located at `http://127.0.0.1:8080`

## Contributing

For contributing, There're probably tons of [issues](https://github.com/rubbieKelvin/notes/issues) opened right now, Self assign your self to a project, fork this repository, push updates/changes to your fork and make a PR.
