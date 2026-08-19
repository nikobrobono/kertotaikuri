export function hintFor(a, b) {
  const table = Math.max(a, b);
  const count = Math.min(a, b);
  if (a === 0 || b === 0) {
    return `Kuvittele, että pitäisi tehdä 0 pussia, joissa jokaisessa olisi ${table} karkkia. Kun pusseja ei ole yhtään, karkkejakaan ei ole. Vastaus on 0.`;
  }
  if (a === 1 || b === 1) {
    return `Kuvittele yksi pussi, jossa on ${table} karkkia. Karkkeja on yhteensä juuri ${table}, koska pusseja on vain yksi.`;
  }
  if (a === 10 || b === 10) {
    return `Ajattele kymppejä: ${count} × 10 tarkoittaa ${count} kymmentä. ${count} kymmentä on ${count * 10}.`;
  }
  if (a === 2 || b === 2) {
    return `Kaksi kertaa tarkoittaa kahta samanlaista joukkoa. Laske siis ${table} + ${table}.`;
  }
  if (a === 5 || b === 5) {
    return `Viisi on puolet kymmenestä. Laske ensin ${count} × 10 = ${count * 10} ja ota tuloksesta puolet.`;
  }
  const strategies = {
    3: `Kolme kertaa on kaksi kertaa ja vielä yksi lisää. Laske ensin 2 × ${count} = ${2 * count} ja lisää siihen vielä ${count}.`,
    4: `Neljän kertotaulussa voit tuplata kahdesti. Ensin ${count} + ${count} = ${2 * count}. Tuplaa sitten ${2 * count}.`,
    6: `Kuusi kertaa on viisi kertaa ja vielä yksi lisää. Laske 5 × ${count} = ${5 * count} ja lisää siihen ${count}.`,
    7: `Seitsemän kertaa voidaan jakaa helpompiin osiin: viisi kertaa ja kaksi kertaa. Laske ${count} × 5 = ${count * 5} ja ${count} × 2 = ${count * 2}. Yhdistä tulokset.`,
    8: `Kahdeksan on kaksi kertaa neljä. Laske ensin ${count} × 4 = ${count * 4} ja tuplaa saamasi luku.`,
    9: `Yhdeksän on yksi vähemmän kuin kymmenen. Laske ensin ${count} × 10 = ${count * 10} ja vähennä tuloksesta ${count}.`
  };
  return strategies[table] ?? `Kertolaskussa lukujen paikat voi vaihtaa. Voit siis laskea ${a} × ${b} myös muodossa ${b} × ${a} ja valita tutumman tavan.`;
}

const hardFactHints = {
  "6x7": [
    "Pilko se viitoseen ja ykköseen: 6 × 7 = (5 × 7) + (1 × 7). Laske 35 + 7 = 42.",
    "Voit käyttää tuttua 7 × 7 -laskua ja ottaa yhden seiskan pois: 49 − 7 = 42."
  ],
  "6x8": [
    "Pilko kuutonen viitoseen ja ykköseen: 6 × 8 = (5 × 8) + (1 × 8). Laske 40 + 8 = 48.",
    "Laske ensin 3 × 8 = 24. Kuusi on kaksi kertaa kolme, joten tuplaa 24: 24 + 24 = 48."
  ],
  "6x9": [
    "Laske ensin helppo 6 × 10 = 60. Yhdeksän on yksi vähemmän kuin kymmenen, joten vähennä yksi kuutonen: 60 − 6 = 54.",
    "Pilko kuutonen viitoseen ja ykköseen: 5 × 9 = 45 ja 1 × 9 = 9. Laske 45 + 9 = 54."
  ],
  "7x7": [
    "Pilko toinen seiska viitoseen ja kakkoseen: 7 × 7 = (7 × 5) + (7 × 2). Laske 35 + 14 = 49.",
    "Aloita tutusta 6 × 7 = 42 ja lisää vielä yksi seiska: 42 + 7 = 49."
  ],
  "7x8": [
    "Pilko seiska viitoseen ja kakkoseen: 7 × 8 = (5 × 8) + (2 × 8). Laske 40 + 16 = 56.",
    "Puolita ja tuplaa: laske ensin 7 × 4 = 28. Koska kahdeksan on kaksi kertaa neljä, tuplaa 28: 28 + 28 = 56.",
    "Käytä apuna 8 × 8 -laskua. 8 × 8 = 64. Laskussa 7 × 8 on yksi kasi vähemmän, joten 64 − 8 = 56."
  ],
  "7x9": [
    "Laske ensin 7 × 10 = 70. Yhdeksän on yksi vähemmän kuin kymmenen, joten vähennä yksi seiska: 70 − 7 = 63.",
    "Pilko seiska viitoseen ja kakkoseen: 5 × 9 = 45 ja 2 × 9 = 18. Laske 45 + 18 = 63."
  ],
  "8x8": [
    "Laske ensin 4 × 8 = 32. Kahdeksan on kaksi kertaa neljä, joten tuplaa 32: 32 + 32 = 64.",
    "Laske 8 × 10 = 80 ja ota pois kaksi kasia: 80 − 16 = 64."
  ],
  "8x9": [
    "Laske ensin 8 × 10 = 80. Yhdeksän on yksi vähemmän kuin kymmenen, joten vähennä yksi kasi: 80 − 8 = 72.",
    "Käytä apuna 8 × 8 = 64 ja lisää vielä yksi kasi: 64 + 8 = 72."
  ],
  "9x9": [
    "Laske ensin 9 × 10 = 90. Yhdeksän on yksi vähemmän kuin kymmenen, joten vähennä yksi ysi: 90 − 9 = 81.",
    "Käytä apuna 8 × 9 = 72 ja lisää vielä yksi ysi: 72 + 9 = 81."
  ]
};

export function hintsFor(a, b) {
  const key = `${Math.min(a, b)}x${Math.max(a, b)}`;
  return hardFactHints[key] ?? [hintFor(a, b)];
}

export const encouragement = (streak) => {
  if (streak >= 8) return "Uskomaton tähtiputki! 🌟";
  if (streak >= 5) return "Mahtava meno! 🔥";
  if (streak >= 3) return "Kolme oikein putkeen! ✨";
  return ["Juuri noin!", "Hienosti ajateltu!", "Loistavaa!", "Sinä osaat!"][streak % 4];
};
