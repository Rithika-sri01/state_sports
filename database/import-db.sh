#!/usr/bin/env bash
# Loads the demo database with mongoimport (alternative to `npm run seed`).
# Usage: ./import-db.sh [mongodb-uri]
URI="${1:-mongodb://127.0.0.1:27017/state_sports_academy}"
DIR="$(cd "$(dirname "$0")" && pwd)"
for c in users sports academylevels coaches athletes medicalrecords fitnessassessments trainingsessions skillassessments tournaments achievements trainingevidences developmentscorecards promotionrequests selectiondecisions sportstats; do
  echo "Importing $c"
  mongoimport --uri "$URI" --collection "$c" --drop --jsonArray --file "$DIR/$c.json" || exit 1
done
echo "Done. Login: admin@academy.in / Password@123"
