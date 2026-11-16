# AI Assistant – Outlook-Add-in für Open WebUI

Fasst E-Mails zusammen, entwirft Antworten, übersetzt und verbessert
Entwürfe – mit deinem eigenen LLM über Open WebUI.

Das Add-in wird über GitHub Pages ausgeliefert:
`https://deimen24.github.io/outlook-ai-addin/`

Im Code steht **keine** Server-Adresse und **kein** Schlüssel. Alles wird
in Outlook im Add-in eingerichtet und nur in deinem Postfach gespeichert.
Deine E-Mails gehen direkt von Outlook an dein Open WebUI, nicht an GitHub.

## Installation

1. `manifest.xml` herunterladen.
2. Outlook → **Add-Ins abrufen** → **Meine Add-Ins** →
   **Benutzerdefiniertes Add-In hinzufügen** → **Aus Datei hinzufügen** →
   `manifest.xml` wählen.
   (Outlook im Web: https://aka.ms/olksideload)

## Einrichten im Add-in

1. E-Mail öffnen → **AI Assistant** im Menüband.
2. Die Einstellungen öffnen sich beim ersten Start automatisch.
3. **Server-URL** deines Open WebUI eintragen.
4. **API-Schlüssel** eintragen
   (Open WebUI → Einstellungen → Konto → API-Schlüssel).
5. **Verbindung testen** → Modell wählen → **Speichern**.

Ändern jederzeit über „Einstellungen“ im Add-in.

## Funktionen

**Beim Lesen:** Zusammenfassen · Antwort entwerfen (→ „Als Antwort
öffnen“) · Übersetzen · Frage zur E-Mail

**Beim Verfassen:** Verbessern · Kürzen · Ton ändern · eigene Anweisung
→ „Text ersetzen“ oder „An Cursor einfügen“

## Voraussetzungen auf dem Open-WebUI-Server

Diese Punkte betreffen deinen Server, nicht das Add-in. Ohne sie
blockiert Outlook (Browser-Sicherheit) jede Verbindung:

- Open WebUI ist per **HTTPS** mit gültigem Zertifikat erreichbar.
- **API-Schlüssel** sind erlaubt
  (Admin-Panel → Einstellungen → Allgemein → „API-Schlüssel aktivieren“).
- **CORS** erlaubt das Add-in:
  `CORS_ALLOW_ORIGIN=https://deimen24.github.io`

## Fehlerbehebung

| Meldung                        | Ursache                                    |
|--------------------------------|--------------------------------------------|
| „Bitte die Server-URL …“       | Noch keine Server-URL eingetragen.         |
| „Server nicht erreichbar“      | Kein HTTPS, Zertifikat nicht vertraut      |
|                                | oder CORS_ALLOW_ORIGIN fehlt.              |
| „API-Schlüssel ungültig“       | Schlüssel falsch oder API-Schlüssel in     |
|                                | Open WebUI nicht aktiviert.                |
| „Server-URL falsch (HTTP 404)“ | URL zeigt nicht auf Open WebUI.            |

## Dateien

```
manifest.xml   in Outlook hinzufügen
src/           Add-in (HTML/CSS/JavaScript)
assets/        Icons
```

Prompts anpassen: `src/prompts.js`.
