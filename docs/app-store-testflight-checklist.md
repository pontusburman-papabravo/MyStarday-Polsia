# TestFlight-checklista — Min Stjärndag

> Steg-för-steg-guide för att ladda upp en build till App Store Connect och bjuda in interna testare via TestFlight.
> Svenska.

---

## Förutsättningar

- Apple Developer-konto med aktivt medlemskap ($99/år)
- Xcode med din app importerad och konfigurerad
- Kodsigneringscertifikat och provisioning profiles
- App Store Connect-appen skapad (App Store → Min Stjärndag)

---

## Steg 1 — Välj rätt schema och enhet

1. Öppna projektet i Xcode (`stjarndag.xcodeproj` eller `stjarndag.xcworkspace`)
2. I verktygsfältet, välj **schema** (`MinStjarndag`) och en fysisk **enhet** (inte "iOS Simulator") — eller Generic iOS Device för archivering
3. Ändra **Build Configuration** till **Release** (Product → Scheme → Edit Scheme → Run → Build Configuration → Release)

---

## Steg 2 — Fylla i version och build-nummer

1. Välj projektfilen i navigeringen → fliken **General**
2. **Version**: t.ex. `1.0.0` (App Store-version)
3. **Build**: t.ex. `1` (öka för varje upload) eller låt Xcode autofylla
4. Se till att **Bundle Identifier** matchar din App Store Connect-app (t.ex. `com.mystarday.app`)

---

## Steg 3 — Konfigurera kodsignering

### Automatisk signering (rekommenderas)

1. Välj projektfilen → fliken **Signing & Capabilities**
2. **Team**: Välj ditt Apple Developer-team
3. **Signing Certificate**: Xcode managed profile (eller din distributionsprofil)
4. **Provisioning Profile**: Automatic
5. För **Release**-build behöver du en **App Store Connect**-profil för distribution — skapas automatiskt om automatisk signering är påslagen

### Om det inte fungerar

1. Gå till [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles**
2. Skapa en **Distribution Certificate** (om du inte redan har en)
3. Skapa en **App Store Connect** provisioning profile för din Bundle ID
4. Ladda ner och installera profilen
5. Välj manuell signering i Xcode och peka på din profil

---

## Steg 4 — Archivering (Archive)

1. Gå till menyn: **Product → Archive**
2. Xcode kompilerar och bygger appen i Release-mode
3. När bygget är klart öppnas **Organizer**-fönstret automatiskt (Window → Organizer)
4. Din build visas i listan med version, build-nummer och datum

---

## Steg 5 — Validering (Validate)

1. I Organizer, välj din build
2. Klicka på **Validate App...**
3. Välj **App Store Connect** som destination
4. Logga in med din Apple Developer-konto (om inte redan inloggad)
5. Xcode kontrollerar att:
   - Certifikat och profiler är giltiga
   - App Store Connect-appen finns och matchar
   - Metadata är korrekt
6. Klicka **Validate** — vänta tills resultat visas
7. Om valideringen godkänns: proceed till nästa steg
8. Om valideringen misslyckas: läs felmeddelandet (ofta saknad provisioning profile eller bundle ID-mismatch), åtgärda och gör om arkivet

---

## Steg 6 — Distribuera till App Store Connect

1. I Organizer, välj samma build
2. Klicka på **Distribute App**
3. Välj **App Store Connect** → **Upload**
4. Klicka **Next** genom alla steg (signering, export compliance, etc.)
5. För **Export Compliance Information**: välj **No** om appen inte använder kryptografi beyond standard HTTPS
6. Klicka **Upload**
7. Vänta 1–5 minuter medan Xcode laddar upp till App Store Connect

---

## Steg 7 — Bekräfta i App Store Connect

1. Gå till [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Välj **Mina appar** → **Min Stjärndag**
3. Klicka på fliken **Versioner** (i vänstermenyn under "App Store")
4. Din build bör visas under "Build" inom 5–15 minuter
5. Status: **Waiting for Review** — kan ta 10–30 minuter innan den blir tillgänglig för TestFlight

---

## Steg 8 — Lägg till interna testare i TestFlight

### Alternativ A: Lägg till via App Store Connect (nyaste metoden)

1. I App Store Connect, gå till **TestFlight**-fliken
2. Välj din app → **Internal Testing**
3. Klicka på **+** (Lägg till testare)
4. Välj testare från listan eller klicka **Skapa interna testare** för att bjuda in via e-post
5. Testaren får ett e-postmeddelande med en unik TestFlight-länk
6. Testaren laddar ner TestFlight-appen från App Store och öppnar länken
7. Builden blir tillgänglig under "Builds" i TestFlight

### Alternativ B: Lägg till via Xcode Cloud (om ni använder det)

1. Gå till Xcode → Preferences → Accounts → Lägg till ditt Apple Developer-konto
2. Ställ in Cloud-organisation
3. Archivering via Xcode Cloud → automatisk upload till App Store Connect

---

## Steg 9 — Snabbtest av TestFlight-build

1. Installera TestFlight på en fysisk iPhone/iPad
2. Öppna TestFlightlänken från e-postmeddelandet
3. Appen installeras under "App Store → TestFlight"
4. Öppna Min Stjärndag och verifiera att den startar korrekt

---

## Checklista — Före upload

| Kontroll | Status |
|----------|--------|
| Bundle ID matchar App Store Connect | ☐ |
| Version och build-nummer ifyllda | ☐ |
| Kodsignering: Team valt, profile aktiv | ☐ |
| Info.plist: Display name, version, build korrekta | ☐ |
| Capabilities: Push Notifications, Sign in with Apple | ☐ |
| Export compliance ifylld (eller N/A) | ☐ |
| App Store Connect-metadata: screenshots, description, keywords klara | ☐ |
| Testkontot `review@mystarday.se` finns i databasen | ☐ |
| SW version i app matches version notes | ☐ |

---

## Vanliga fel och åtgärder

| Fel | Åtgärd |
|-----|--------|
| `No profiles for bundle ID` | Skapa en App Store Connect provisioning profile i Apple Developer-portalen |
| `Signing certificate not found` | Installera din distributionscertifikat i Keychain |
| `Profile doesn't match bundle ID` | Kontrollera att Bundle ID i Xcode matchar profilen exakt |
| `Export compliance not provided` | Ladda upp igen och svara "No" på cryptographic export |
| Build inte synlig i TestFlight | Vänta 15 min — Apple behöver tid att procesera |
| `Invalid Swift version` | Kontrollera att Swift-version i build settings matchar projektets Swift-version |