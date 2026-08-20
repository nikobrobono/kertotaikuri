# Kertotaikuri

Kannustava, mobiiliystävällinen 0–10-kertotaulupeli. Pelissä voi opetella laskut kuvien avulla, harjoitella yhden taulun kerrallaan, tehdä päivittäin 10 yksilöllistä tehtävää ja edetä lopulta kaikkien kertotaulujen Grande finaleen.

Peli painottaa vaikeiksi osoittautuneita laskuja. Nelitasoinen taitokartta näyttää, mitä vasta opetellaan ja mikä sujuu jo varmasti. Vastausnopeutta käytetään sujuvuuden arviointiin ilman aikapainetta; vain Grande finalessa nopeudesta saa lisäpisteitä. Tähdillä ja harjoitelluilla tauluilla avautuu kosmeettisia palkintoja.

Pelin kirjautumisruutu on vain kevyt pääsyeste. Tunnukset ovat staattisen verkkosovelluksen lähdekoodissa, joten sitä ei pidä käyttää luottamuksellisen tiedon suojaamiseen.

## Käynnistys

```bash
npm start
```

Avaa `http://localhost:4173`. Testit: `npm test`.

## iPhone

Kun sivusto on julkaistu HTTPS-osoitteeseen, avaa se Safarissa ja valitse **Jaa → Lisää Koti-valikkoon**. PWA toimii tämän jälkeen sovelluksen tavoin ja välimuistin latauduttua myös ilman verkkoyhteyttä.

## Rakenne

- `src/domain/` sisältää opetussuunnitelman, kysymysten valinnan ja vinkit ilman käyttöliittymäriippuvuuksia.
- `src/data/` vastaa paikallisesta tallennuksesta sekä versionoidusta varmuuskopiosta.
- `src/main.js` on käyttöliittymä- ja pelisessiokerros.

Uusia tehtävätyyppejä voidaan lisätä omina domain-moduuleinaan. Nykyiset opetusvinkit toimivat kokonaan laitteella. Myöhempi tekoälypalvelu liitetään erillisen palvelurajapinnan kautta niin, ettei lapsen tunnistetietoja tai vastauksia lähetetä ilman huoltajan nimenomaista valintaa.
