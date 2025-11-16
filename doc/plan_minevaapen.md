# MineVåpen - Planleggingsdokument

## Status (oppdatert fortløpende)

- [x] Expo-prosjekt initialisert med TypeScript, expo-router og grunnleggende lint-oppsett.
- [x] SQLite-database etablert med schema og seeding av organisasjoner og skyteprogram.
- [x] I18n-struktur flyttet fra plan til kodebasen med faktiske språkfiler.
- [ ] UI-komponenter koblet til lokalt lagrede data og kontrollerte tester.

## 1. Formål og visjon

MineVåpen skal gi sportsskyttere full kontroll over egne våpen, tilknyttede skyteprogram og nødvendig dokumentasjon. Appen skal gjøre det enkelt å se hva som er godkjent, hva som er registrert som reserve, og hva som må oppdateres.

## 2. Målgruppe

- Aktive sportsskyttere som deltar i flere skyteprogrammer.
- Skyttere som er medlem av flere skytterorganisasjoner.
- Brukere som trenger dokumentasjon raskt tilgjengelig for kontroll eller oppfølging av søknader.

## 3. Plattform og teknologi

- Mobilapp for Android og iOS bygget med React Native.
- Appen skal bruke TypeScript og Expo (eller React Native CLI der det gir bedre native-kontroll) for å få rask iterasjon og enkel tilgang til kamera, lagring og push-varsler.
- Tilstandshåndtering: bruk Redux Toolkit kombinert med React Query for serverstate; Context + hooks til enklere skjermstate.
- Navigasjon: React Navigation (stack + tab) med deep-link-støtte til våpen og programmer.
- Lagring: lokal database via WatermelonDB eller SQLite (Expo SQLite) for kryptert offline-lagring. Planlegg for mulig fremtidig sky-synkronisering via en Node/GraphQL-backend.
- Native moduler: benytt React Native Vision Camera (eller Expo Camera) for bildeopptak og react-native-fs for dokumenter.

## 4. Kjernelogikk og funksjoner

- **Brukerprofil**: registrere og oppdatere egne detaljer.
- **Organisasjoner**: legge til medlemskap og se program per organisasjon.
- **Skyteprogram**: velge programmer fra forhåndsdefinerte lister og markere favoritter.
- **Våpenregister**:
  - Lagre type, produsent, modell, serienummer, anskaffelsespris, anskaffelsesdato og referanse til våpenkort.
  - Markere hvilke programmer våpenet er godkjent for og om det er reserve.
  - Registrere andre programmer våpenet passer til uten godkjenning.
  - Laste opp flere bilder per våpen (kamera og galleri).
- **Filtrering og søk**: filtrere våpenliste per organisasjon, program og reserveflagg.
- **Dokumenthåndtering**: lagre digitale kopier av våpenkort og andre vedlegg.
- **Varsler (opsjon)**: minne om manglende konkurranser eller kommende fornyelser.

## 5. Internasjonalisering (i18n)

- Alle tekster defineres som engelske nøkkelstrenger (f.eks. `weapon.details.title`) som brukes konsekvent i hele kodebasen.
- Hvert språk får sin egen ressursfil (JSON/YAML/arb) med samme nøkkelsett. Minimum: `nb_NO` (bokmål) og `nn_NO` (nynorsk). Mulig å utvide med flere språk ved å legge til nye filer.
- Appen laster oversettelser via et React Native-kompatibelt i18n-rammeverk (f.eks. i18next + react-i18next eller FormatJS/lingui) og velger språk basert på brukerinnstilling eller OS-lokale.
- Språkvalg lagres per brukerprofil og kan endres i innstillinger; visning oppdateres uten app-restart dersom rammeverket støtter «hot reload» av strengene.
- Nye tekster legges alltid inn i en kjernespråkfil (engelsk nøkkel) før de oversettes til bokmål og nynorsk for å sikre at filer er synkronisert.
- Fallback-regel: dersom en streng mangler i valgt språk, brukes bokmål først og engelske nøkkelen til slutt slik at UI aldri mangler tekst.

## 6. Data- og domenemodell

### Entiteter

- **Shooter**: id, navn, kontaktinfo, adresse, preferanser.
- **Organization**: id, navn, orgnr.
- **Program**: id, navn, organizationId.
- **Weapon**: id, shooterId, type, produsent, modell, serienummer, anskaffelsespris, anskaffelsesdato, våpenkortRef, notat.
- **WeaponProgramStatus**: id, weaponId, programId, status (godkjent, foreslått, avventer), reserveFlag, kommentar.
- **WeaponPhoto**: id, weaponId, filURI, metadata (dato, merknad).
- **Membership**: id, shooterId, organizationId, medlemsnummer.

### Relasjoner

- En Shooter kan ha flere Membership-poster.
- En Organization har flere Program.
- Et Weapon tilhører en Shooter.
- Weapon knyttes til Program via WeaponProgramStatus.
- Weapon kan ha flere WeaponPhoto.

## 7. Funksjonelle krav

1. Bruker kan registrere, oppdatere og slette våpen med alle felt.
2. Bruker kan knytte våpen til flere programmer og markere status og reserveflagg per program.
3. Appen viser hvilke programmer et våpen er godkjent for, hva som er reserve og hvilke alternative programmer som passer.
4. Bruker kan filtrere og søke i våpenlisten etter organisasjon, program og reserveflagg.
5. Bruker kan laste opp og vise flere bilder per våpen.
6. Appen fungerer offline og lagrer data lokalt med kryptert lagring der det er tilgjengelig.
7. Bruker kan eksportere data (PDF/CSV) for kontroll eller søknad.
8. Appen logger endringer lokalt for eventuell synk mot backend.

## 8. Ikke-funksjonelle krav

- **Ytelse**: rask filtrering og navigasjon i lokal database.
- **Tilgjengelighet**: universell utforming, tydelig design, norsk språk som standard.
- **Sikkerhet**: passkode/biometri, kryptert lagring og sikre filreferanser.
- **Skalerbarhet**: modulbasert arkitektur som kan utvides med sky-synk.
- **Vedlikehold**: tydelige lag (UI, domene, data) og gjenbrukbare komponenter.

## 9. Brukerhistorier

- Som skytter vil jeg registrere et nytt våpen med bilder slik at jeg har full dokumentasjon.
- Som skytter vil jeg filtrere alle våpen som er reserve i Dynamisk Sportsskyting Norge for rask oversikt.
- Som skytter vil jeg se hvilke programmer et våpen er godkjent for og hvilke andre programmer det kan brukes i.
- Som skytter vil jeg ha våpenkort og vedlegg lagret digitalt for rask fremvisning ved kontroll.

## 10. UX og skjermbilder (skisse)

- **Dashboard**: kort per organisasjon med antall godkjente våpen og reserver.
- **Våpenliste**: tabell- eller kortvisning med filterchips for organisasjon, program og reserve.
- **Våpendetalj**: faner for detaljer, programstatus, dokumenter og bilder.
- **Organisasjoner**: oversikt og redigering av medlemskap og program.
- **Bildegalleri**: enkel karusell med merking av relevante komponenter.

## 11. Potensielle utvidelser

- Integrasjon mot offentlige API-er dersom de åpnes for søknadsdata.
- Deling av data med klubbadministrator via eksportlenke eller QR.
- Sky-synk for backup og flere enheter (kryptert).
- Automatiske regeloppdateringer per organisasjon med varsling.

## 12. Risiko og avhengigheter

- Regelverk rundt våpenoppbevaring kan endre seg.
- Strenge krav til personvern og håndtering av sensitive data.
- Behov for robust kryptering for lagring av bilder og dokumenter.
- Kompleksitet ved eventuell integrasjon mot Politiets systemer.
- Vedlikehold av referanselister for organisasjoner og programmer.

## 13. Neste steg

1. Initialiser React Native-prosjekt (Expo + TypeScript) og sett opp CI/CD (GitHub Actions + EAS Build/Test).
2. Lag wireframes og detaljerte brukerflyter.
3. Definer datamodell i valgt lagringsteknologi og etabler domene-lag.
4. Bygg en MVP-backlog med prioriterte brukerhistorier og estimater.
5. Implementer kritiske skjermbilder i React Native: våpenliste, registrering og filtrering.
6. Design sikkerhetsmekanismer (kryptert lagring, passkode/biometri) og plan for secrets-håndtering i React Native.
