# Arkkitehtuuri ja laajennukset

Kertotaikuri on selaimen natiiveilla ES-moduuleilla rakennettu PWA. Kerrokset riippuvat vain alaspäin:

1. `src/domain/`: opetussuunnitelma, tehtävien valinta ja laskustrategiat. Ei selaimen käyttöliittymäriippuvuuksia.
2. `src/data/`: tallennusrajapinta. Nykyinen toteutus käyttää vain tämän pelin omaa `localStorage`-avainta.
3. `src/main.js`: pelisession orkestrointi ja näkymä.
4. `sw.js` ja manifesti: asennus ja offline-käyttö.

## Uusi harjoitusosio

Lisää osion puhdas tehtävägeneraattori ja arviointi `src/domain/`-hakemistoon. Käyttöliittymän tarvitsee tuntea vain tehtävän teksti, odotettu vastaus, vinkki ja tulos. Esimerkiksi jakolasku voidaan toteuttaa kertolaskusta erillisenä moduulina muuttamatta edistymisen tallennusrajapintaa.

## Tekoäly myöhemmin

Tekoälyä ei tarvita oikeiden vastausten, vaikeustason tai perusvinkkien tuottamiseen. Jos myöhemmin lisätään sanallisia tehtäviä tai yksilöllisempi valmentaja, tee verkkokutsu erillisen `src/services/aiCoach.js`-rajapinnan taakse ja tarjoa aina paikallinen oletustoiminto.

Lapsen vastauksia, nimeä tai muita tunnistetietoja ei pidä lähettää verkkopalveluun oletuksena. AI-toiminnon käyttöönotto tarvitsee huoltajan näkyvän suostumuksen, tietojen minimoinnin ja palvelinpuolen avainhallinnan; API-avainta ei tallenneta selainkoodiin.

## Mahdollinen App Store -versio

Sama selainkäyttöliittymä voidaan myöhemmin paketoida Capacitor-kuoreen. PWA kannattaa pitää ensisijaisena jakeluna ensimmäisiin perhetesteihin, koska sen päivitys ei vaadi App Store -kierrosta.
