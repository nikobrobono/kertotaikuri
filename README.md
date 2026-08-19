# Kertotaikuri

Kannustava, mobiiliystävällinen 0–10-kertotaulupeli. Peli etenee kuuden tason kautta helpoista ankkureista kaikkien kertotaulujen satunnaiseen harjoitteluun.

## Käynnistys

```bash
npm start
```

Avaa `http://localhost:4173`. Testit: `npm test`.

## iPhone

Kun sivusto on julkaistu HTTPS-osoitteeseen, avaa se Safarissa ja valitse **Jaa → Lisää Koti-valikkoon**. PWA toimii tämän jälkeen sovelluksen tavoin ja välimuistin latauduttua myös ilman verkkoyhteyttä.

## Rakenne

- `src/domain/` sisältää opetussuunnitelman, kysymysten valinnan ja vinkit ilman käyttöliittymäriippuvuuksia.
- `src/data/` vastaa paikallisesta tallennuksesta.
- `src/main.js` on käyttöliittymä- ja pelisessiokerros.

Uusia tehtävätyyppejä voidaan lisätä omina domain-moduuleinaan. Myöhempi tekoälypalvelu kannattaa liittää erillisen rajapinnan kautta niin, ettei lapsen tunnistetietoja tai vastauksia lähetetä ilman huoltajan nimenomaista valintaa.
