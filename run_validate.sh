#!/bin/sh

date
source source_me.sh
python3 ./validation/validate.py -q
echo ""
