import json
import typing
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_CSS_FILE = BASE_DIR / "src/styles/theme.css"
TAILWIND_DATA_FILE = Path(__file__).resolve().parent / "tailwind.config.json"
OUTPUT_TS_CONFIG_FILE = BASE_DIR / "tailwind.config.cjs"
DATA_DIRECTORY = Path(__file__).resolve().parent / "themes"
THEME_WRAPPER_SELECTOR = "body"


def themeToCssString(file: Path) -> str:
    with open(file) as datafile:
        data = json.load(datafile)
        name: str = data["name"]
        theme: dict[str, dict[str, typing.Any]] = data["theme"]

        classname = ":root" if name == "main" else f"{THEME_WRAPPER_SELECTOR}.{name}"

        properties: dict[str, typing.Any] = {}

        for sectionedProperties in theme.values():
            properties.update(sectionedProperties)

        return (
            classname
            + " {\n"
            + "\n".join([f"\t--{key}: {value};" for key, value in properties.items()])
            + "\n}"
        )


def themeToJS():
    # read tailwind config
    with open(TAILWIND_DATA_FILE) as tw_datafile:
        tw_cfg = json.load(tw_datafile)

    with open(DATA_DIRECTORY / "main.json") as datafile:
        res = {}
        data = json.load(datafile)
        theme: dict[str, dict[str, typing.Any]] = data["theme"]

        for groupName, groupProperties in theme.items():
            res[groupName] = {}
            for key in groupProperties.keys():
                res[groupName][key] = f"var(--{key})"

    tw_cfg["theme"]["extend"] = res

    with open(OUTPUT_TS_CONFIG_FILE, "w") as file:
        file.write(
            f'// Autogenerated by "{__file__}"\n'
            + "/** @type {import('tailwindcss').Config} */\n\nmodule.exports = "
            + json.dumps(tw_cfg, indent=2)
            + "\n"
        )


def main():
    datafiles = list(DATA_DIRECTORY.glob("*.json"))
    css = ""

    for datafile in datafiles:
        css += themeToCssString(datafile)

    with open(OUTPUT_CSS_FILE, "w") as css_out:
        css_out.write(f'/* Autogenerated by "{__file__} */\n\n' + css + "\n")

    themeToJS()
    return


main()
