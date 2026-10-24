# Feilsøking: Betalingskrav ved Lisenstesting

Hvis du ser en pris på knappen i Google Play Store (f.eks. "Kjøp kr 49,00") i stedet for "Installer", betyr det at Google Play **ikke** gjenkjenner deg som en lisenstester ennå.

**IKKE trykk på Kjøp** hvis du ser prisen. Som lisenstester skal knappen endre seg til "Installer" (eller vise en pris med en tydelig test-markering i betalingsvinduet, men for betalte apper er det vanligvis direkte installasjon).

Her er sjekklisten for å fikse dette:

## 1. Godta invitasjonen (Viktigst!)
Du må manuelt godta å bli tester for å få tilgang til testversjonen.
1.  Åpne lenken for testsporet (Internal/Closed testing) på telefonen din.
    *   Lenken ser ofte slik ut: `https://play.google.com/apps/testing/com.sigurdne.minevapen`
2.  Klikk på knappen **"BECOME A TESTER"** (Bli tester).
3.  Det skal stå "You are now a tester".
4.  Vent 5-10 minutter.
5.  Lukk Play Store helt og åpne den igjen via lenken "download it on Google Play".

## 2. Sjekk "License Testing" i Google Play Console
1.  Logg inn i [Google Play Console](https://play.google.com/console).
2.  Gå til **Setup** (Oppsett) -> **License testing** (Lisenstesting).
3.  Sjekk at e-postlisten din er valgt under "License testers".
4.  Sjekk at "License response" er satt til **LICENSED**.
5.  Trykk **Save** selv om du ikke gjorde endringer, for å tvinge en oppdatering.

## 3. Sjekk Google Play-kontoen på enheten
1.  Åpne Google Play Store.
2.  Trykk på profilikonet ditt.
3.  Sjekk at e-posten er **nøyaktig den samme** som i punkt 2.
4.  Hvis du har flere kontoer på telefonen: Play Store velger noen ganger feil konto. Bytt til riktig konto i menyen, eller prøv å installere via nettleseren på PC (logget inn med riktig konto).

## 4. Tøm buffer for Google Play Store
Hvis knappen fortsatt viser pris etter at du har blitt tester:
1.  Gå til **Innstillinger** på telefonen -> **Apper**.
2.  Finn **Google Play Store**.
3.  Velg **Lagring** -> **Tøm buffer** (Clear Cache) og **Tøm data** (Clear Data).
4.  Start Play Store på nytt.

## 5. Ventetid
Det kan ta noen timer fra du legger til en tester til Google oppdaterer systemene sine. Hvis du nettopp la deg til, vent 2-3 timer.

## Hvordan ser en test-betaling ut?
Hvis du tester *kjøp inne i appen* (IAP), vil du se en betalingsdialog.
*   For lisenstestere skal det stå: **"Test card, always approves"**.
*   Du blir **ikke** belastet hvis du ser denne teksten.
*   Hvis du ser ditt vanlige Visa/Mastercard uten "Test card"-teksten, **avbryt**. Du er ikke gjenkjent som tester.
