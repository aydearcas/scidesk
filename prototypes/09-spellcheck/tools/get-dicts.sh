#!/bin/sh
# Downloads the LibreOffice Hunspell dictionaries used by prototype 9 into dicts/.
# es_ES: RLA-ES, triple licence GPL-3 / LGPL-3 / MPL-1.1 (SciDesk would use it under MPL-1.1).
# en_US: SCOWL (BSD-style). en_GB: LGPL in LibreOffice; SCOWL also publishes en_GB under its own licence.
set -e
mkdir -p "$(dirname "$0")/../dicts"
cd "$(dirname "$0")/../dicts"
base=https://raw.githubusercontent.com/LibreOffice/dictionaries/master
for f in es/es_ES.aff es/es_ES.dic es/LICENSE.md es/README_hunspell_es.txt en/en_US.aff en/en_US.dic en/en_GB.aff en/en_GB.dic en/README_en_US.txt en/README_en_GB.txt; do
  curl -sfL -o "$(basename "$f")" "$base/$f"
done
ls -l
