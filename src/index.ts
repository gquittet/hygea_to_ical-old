import axios from "axios";
import { format } from "date-fns";
import fs from "fs";
import { v4 as uuidV4 } from "uuid";
import { APIResult, Calendar } from "./types.js";

const HYGEA_API_URI = "https://www.hygea.be/displaycalws.html";
const POSTAL_CODE = 7390;
const START_DATE = new Date("2021-01-01");
const END_DATE = new Date("2022-01-01");

function toUnixTimestamp(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function calendarToICal(calendar: Calendar) {
  const stream = fs.createWriteStream("hygea.ical");
  stream.write(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:www.example.com
X-PUBLISHED-TTL:P1W
`);

  for (const [date, description] of Object.entries(calendar)) {
    stream.write(`BEGIN:VEVENT
UID:${uuidV4()}
DTSTART;TZID=Europe/Brussels;VALUE=DATE:${format(new Date(date), "yyyyMMdd")}
SEQUENCE:0
TRANSP:OPAQUE
DTEND;TZID=Europe/Brussels;VALUE=DATE:${format(new Date(date), "yyyyMMdd")}
URL:https://www.hygea.be/votre-calendrier-de-collecte.html?cp=${POSTAL_CODE}
SUMMARY:Collecte des déchets
DESCRIPTION: ${description}
X-MICROSOFT-CDO-ALLDAYEVENT:TRUE
END:VEVENT
`);
  }

  stream.write("END:VCALENDAR");

  stream.on("finish", () => console.log("Done!"));
  stream.end();
}

async function hygeaToICal() {
  const { data }: { data: APIResult } = await axios.get(HYGEA_API_URI, {
    params: {
      street: POSTAL_CODE,
      start: toUnixTimestamp(START_DATE),
      end: toUnixTimestamp(END_DATE),
    }
  });

  const calendar = data.reduce((acc: Calendar, { start, className }) => {
    if (className.includes(" om ")) {
      acc[start] = "Collecte des sacs blancs";
      return acc;
    }

    if (className.includes(" pmc ")) {
      acc[start] = "Collecte des sacs blancs, des sacs bleus (PMC) et papiers cartons";
      return acc;
    }

    return acc;
  }, {});

  calendarToICal(calendar);
}

hygeaToICal();
