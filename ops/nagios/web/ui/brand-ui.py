#!/usr/bin/env python3
"""Rebrand the Nagios Core web interface for HiClippy, at image build time.

Every screen stays (all CGIs, reports, commands); only the look changes:
  1. Status colours in every stylesheet are remapped to HiClippy's palette.
  2. theme.css (fonts, layout, side menu) is appended to every stylesheet.
  3. The side menu gets the HiClippy brand, a Dashboard link and Sign out.
  4. The home page (an advert for the commercial edition) is replaced by a
     redirect to the HiClippy dashboard.

Each patch asserts that the markup it expects is there, so a future Nagios
release that changes its pages fails the build instead of half-applying.
"""

import os
import pathlib
import re
import sys

SHARE = pathlib.Path(os.environ.get("NAGIOS_SHARE", "/usr/local/nagios/share"))
HERE = pathlib.Path(__file__).resolve().parent

# Nagios's own reference palette (documented at the top of common.css)
# mapped to HiClippy's. Strong colours fill status cells, light ones rows.
PALETTE = {
    "88d066": "4cc38a",  # OK / UP
    "cce8cc": "e2f5eb",  # OK, light
    "ffff00": "f4c430",  # WARNING (the site's flower yellow)
    "feffc1": "fff8de",  # WARNING, light
    "f88888": "f27474",  # CRITICAL / DOWN
    "ffdddd": "fdecec",  # CRITICAL, light
    "ffbb55": "ff9e6d",  # UNKNOWN / UNREACHABLE (the site's flower orange)
    "ffddaa": "ffe7d6",  # UNKNOWN, light
    "acacac": "c5d3cb",  # PENDING
    "66ffee": "4cc38a",  # OK in mini status
    "d0d0d0": "d4efe2",  # table headers
    "e7e7e7": "f3faf6",  # odd rows
    "f4f2f2": "ffffff",  # even rows
    "777777": "c9e3d6",  # cell borders
    "4d89f9": "1b9e62",  # primary
}

FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');\n"


def must_replace(text, old, new, what):
    if old not in text:
        sys.exit(f"brand-ui: expected markup not found ({what}); Nagios pages changed, update brand-ui.py")
    return text.replace(old, new, 1)


def restyle_stylesheets():
    theme = (HERE / "theme.css").read_text()
    sheets = sorted((SHARE / "stylesheets").glob("*.css"))
    if not sheets:
        sys.exit("brand-ui: no stylesheets found")
    pattern = re.compile(r"#(" + "|".join(PALETTE) + r")\b", re.IGNORECASE)
    for sheet in sheets:
        css = sheet.read_text()
        css = pattern.sub(lambda m: "#" + PALETTE[m.group(1).lower()], css)
        if sheet.name == "common.css":
            css = FONT_IMPORT + css  # @import must come before every other rule
        sheet.write_text(css + "\n" + theme)
    print(f"brand-ui: restyled {len(sheets)} stylesheets")


def brand_side_menu():
    side = SHARE / "side.php"
    php = side.read_text()
    php = must_replace(
        php,
        '<a href="https://www.nagios.org" target="_blank"><div class="fulllogo nagioslogo"></div></a>',
        '<a class="hc-brand" href="hiclippy/" target="<?php echo $link_target;?>">'
        '<video src="/assets/mascot.webm" poster="/assets/logo.png" autoplay loop muted playsinline aria-hidden="true"></video>'
        '<span>HiClippy</span></a>\n'
        '\t<div class="hc-sub">Monitoring <b>Nagios Core <?php echo $this_version; ?></b></div>',
        "side menu logo",
    )
    php = must_replace(
        php,
        '<li><a href="main.php" target="<?php echo $link_target;?>">Home</a></li>',
        '<li><a class="hc-primary-link" href="hiclippy/" target="<?php echo $link_target;?>">HiClippy dashboard</a></li>',
        "side menu Home link",
    )
    php = must_replace(
        php,
        '<div class="navsectiontitle">System</div>\n\t<div class="navsectionlinks">\n\t\t<ul class="navsectionlinks">',
        '<div class="navsectiontitle">System</div>\n\t<div class="navsectionlinks">\n\t\t<ul class="navsectionlinks">'
        '\n\t\t\t<li><a href="/logout" target="_top">Sign out</a></li>',
        "side menu System section",
    )
    php = must_replace(
        php,
        '<link href="stylesheets/common.css',
        '<link rel="icon" type="image/png" href="/favicon.png">\n<link href="stylesheets/common.css',
        "side menu stylesheet link",
    )
    side.write_text(php)
    print("brand-ui: side menu branded")


def replace_home_page():
    # main.php is Nagios's splash page, mostly an advert for the commercial
    # edition. The dashboard takes its place; every other screen is untouched.
    (SHARE / "main.php").write_text('<?php header("Location: hiclippy/"); exit; ?>\n')
    index = SHARE / "index.php"
    php = index.read_text()
    php = must_replace(
        php,
        '<title>Nagios: <?php echo $_SERVER[\'SERVER_NAME\']; ?></title>',
        '<title>HiClippy monitoring</title>',
        "frameset title",
    )
    php = must_replace(
        php,
        '<link rel="shortcut icon" href="images/favicon.ico" type="image/ico">',
        '<link rel="icon" type="image/png" href="/favicon.png">',
        "frameset favicon",
    )
    php = must_replace(php, "--border: #28303E", "--border: #24463a", "frameset border colour")
    index.write_text(php)
    print("brand-ui: home page now opens the HiClippy dashboard")


if __name__ == "__main__":
    restyle_stylesheets()
    brand_side_menu()
    replace_home_page()
