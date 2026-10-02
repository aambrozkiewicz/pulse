# Pulse — prywatna analityka

Osobna aplikacja Next.js + Prisma + PostgreSQL dla dowolnych stron internetowych. Natywny Node.js, bez Dockera. Dashboard jest prywatny, tracker i collector publiczne. Nie ma rejestracji ani domyślnego hasła. Wszystkie konta administratorów widzą wszystkie strony.

## Lokalnie

Wymagania: Node.js 22+, npm, PostgreSQL 15+.

```bash
npm ci
cp .env.example .env
# Ustaw DATABASE_URL i APP_URL w .env
npm run db:deploy
npm run admin
npm run dev
```

`npm run admin` tworzy konto albo zmienia jego hasło i unieważnia istniejące sesje. Hasło ma minimum 12 znaków. W interaktywnym poleceniu wpisywane hasło jest widoczne — uruchamiaj w prywatnym terminalu. Alternatywnie skrypt obsługuje ADMIN_EMAIL i ADMIN_PASSWORD w środowisku. Nie zapisuj ich w repo.

Zaloguj się na http://localhost:3000/login. W dashboardzie kliknij „Dodaj stronę”, wpisz dowolną nazwę, klucz (np. `moja-strona`) i originy (np. `https://example.com, https://www.example.com`). Ustaw nazwę zdarzenia konwersji oraz opcjonalną listę kroków do pokazania w dashboardzie. Origin to protokół + host + opcjonalny port, bez końcowego `/`. Dla lokalnego testu dodaj origin lokalnego landingu, np. `http://localhost:8080`.

## VPS Ubuntu — Node.js + supervisord + Nginx

1. Przygotuj Node.js 22+, PostgreSQL i bazę. Konto aplikacji powinno być właścicielem własnej bazy/schema (unikniesz błędu permission denied for schema public).

Przykład w konsoli `sudo -u postgres psql`:

```sql
CREATE ROLE pulse LOGIN PASSWORD 'TUTAJ_MOCNE_HASLO';
CREATE DATABASE pulse OWNER pulse;
```

2. Wgraj projekt do `/var/www/pulse`, nadaj użytkownikowi usługi prawa do katalogu, przygotuj `.env`:

```dotenv
DATABASE_URL=postgresql://pulse:URL_ENCODED_PASSWORD@127.0.0.1:5432/pulse
APP_URL=https://analytics.twojadomena.pl
RETENTION_DAYS=365
```

Hasło w URL musi mieć percent-encoding znaków specjalnych. `APP_URL` to rzeczywisty publiczny adres — jest używany do ochrony originów logowania i ciasteczka Secure.

```bash
cd /var/www/pulse
npm ci
npm run db:deploy
npm run build
npm run admin
chmod 600 .env
```

3. Dostosuj `deploy/pulse.conf`: `user`, `directory`, ścieżkę `/usr/bin/node` (sprawdź `which node`). Node instalowany przez nvm nie znajduje się automatycznie w PATH supervisord. Next.js ładuje `.env` z katalogu projektu; ustaw w nim DATABASE_URL i APP_URL.

```bash
sudo cp deploy/pulse.conf /etc/supervisor/conf.d/pulse.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status pulse
sudo supervisorctl tail -f pulse stderr
```

4. Skieruj subdomenę na VPS. Dodaj blok `location` z `deploy/nginx.conf` do serwera Nginx dla subdomeny, skonfiguruj HTTPS i przekierowanie HTTP → HTTPS. Aplikacja nasłuchuje tylko na `127.0.0.1:3000`; PostgreSQL również powinien być dostępny lokalnie. Jeśli port 3000 jest zajęty, zmień go w supervisord i Nginx.

5. Aktualizacja po zmianie kodu:

```bash
cd /var/www/pulse
npm ci
npm run build
npm run db:deploy
sudo supervisorctl restart pulse
```

Zrób backup PostgreSQL przed migracjami. Repo zawiera inicjalną migrację. Nowe modele: `npm run db:migrate -- --name opis_zmiany` lokalnie; na produkcji zawsze `npm run db:deploy`.

## Integracja dowolnej strony

Istniejącą stronę zmienisz przyciskiem „Edytuj stronę”. Klucz jest stały, żeby zachować działanie trackera; dodawanie nowej strony nie nadpisuje istniejącej.

W dashboardzie wybierz stronę i kliknij „Dokumentacja integracji i kod dla tej strony”. Znajdziesz tam snippet z jej kluczem, przykłady skonfigurowanych zdarzeń oraz checklistę podłączenia. Pulse nie wymaga znajomości kodu ani nazwy Twojego projektu.

Dodaj snippet przed `</head>`:

```html
<script
  defer
  src="https://analytics.twojadomena.pl/tracker.js"
  data-site="moja-strona"
></script>
```

Tracker wysyła automatycznie `page_view` oraz reaguje na pushState, replaceState i popstate. Nie wysyła parametrów query ani fragmentów ścieżki. Referrer jest sprowadzany przez API do hostname. UTM-y są zapamiętane na czas sesji.

Kliknięcia można oznaczyć bez własnego JS:

```html
<a href="#contact" data-analytics="cta_clicked" data-analytics-location="hero"
  >Porozmawiajmy</a
>
```

Inne zdarzenia:

```javascript
// Tylko raz przy pierwszej interakcji z formularzem:
window.analytics?.track("contact_started");
// Dopiero po potwierdzeniu sukcesu wysłania formularza przez backend:
window.analytics?.track("conversion", { form: "contact" });
```

Nie wysyłaj e-maili, nazwisk, telefonów, treści wiadomości, tokenów ani identyfikatorów zamówień w properties/UTM/path. API dopuszcza do 10 prostych properties. Tracker ignoruje DNT i Global Privacy Control przez rezygnację ze zbierania danych, jeśli te sygnały są aktywne. Używa localStorage do identyfikatora odwiedzającego i sesji; jeśli landing wymaga zgody, załaduj snippet dopiero po jej uzyskaniu. Projekt nie implementuje banera zgody.

Przy CSP dopuść domenę analytics w `script-src` i `connect-src`. Transport to POST `text/plain` (bez preflight), nie wymaga cookies i działa między domenami. Dozwolone originy są sprawdzane per strona. Publiczny klucz strony nie jest sekretem; sprawdzenie Origin ogranicza zbieranie z obcych stron, nie stanowi uwierzytelnienia wobec fałszowanych klientów HTTP.

## Metryki

- Odwiedzający: distinct visitorId w wybranym okresie, nie faktyczne osoby. Inna przeglądarka/wyczyszczony localStorage to nowy odwiedzający.
- Sesje: distinct sessionId w wybranym okresie; po 30 min bezczynności tracker tworzy nową.
- Konwersja: odwiedzający ze zdarzeniem skonfigurowanym jako konwersja / wszyscy odwiedzający z dowolnym zdarzeniem w okresie. Liczba wysłanych zdarzeń konwersji jest prezentowana osobno.
- Źródła: distinct sesje wg UTM source, a następnie referrer host, a następnie Direct.
- „Kroki na stronie”: liczba odwiedzających z każdym zdarzeniem w okresie. Nie sprawdza kolejności ani przynależności do kohorty; to uproszczony widok kroków, nie ścisła analiza lejka.
- Wykres i okresy używają UTC, obejmując bieżący dzień.
- Administrator tworzy/aktualizuje stronę po kluczu: nazwa, originy, zdarzenie konwersji i do 10 unikalnych kroków. Pusta lista ukrywa kroki. Zmiana originów zastępuje całą listę. Własne zdarzenia są zbierane niezależnie od listy kroków.

## Bezpieczeństwo i utrzymanie

Hasła bcrypt cost 12, losowe 256-bitowe sesje, w bazie tylko hash tokenu, HttpOnly/SameSite=Lax, Secure przy HTTPS, sesje 7 dni. Brak publicznego zakładania kont. Mutacje administratora wymagają logowania; logowanie i wylogowanie sprawdzają Origin. Limity prób trzymane w PostgreSQL: 8/e-mail/15 min i 40 globalnie/15 min. Collector: 120 zdarzeń/visitor/min i 3000/strona/min. ID zdarzenia UUID deduplikuje zapis. IP nie jest zapisywane w bazie aplikacji; logi Nginx mogą je zawierać. To MVP do własnych małych projektów — collector nie ma kolejki, retry ani pełnego wykrywania botów.

Uruchamiaj raz dziennie `npm run cleanup` jako użytkownik projektu (np. cron). Skrypt ładuje `.env`, usuwa zdarzenia starsze niż RETENTION_DAYS oraz wygasłe sesje i rekordy limitów. Przykład po sprawdzeniu lokalizacji npm:

```cron
15 3 * * * cd /var/www/pulse && /usr/bin/npm run cleanup >> /var/www/pulse/cleanup.log 2>&1
```

## Weryfikacja

```bash
npm test
npm run typecheck
npm run build
```

Testy sprawdzają walidację payloadu, usuwanie query/hash, referrer, tracker SPA, odnawianie sesji, atrybucję i DNT. Przed użyciem na VPS przetestuj logowanie, wylogowanie, stronę bez sesji oraz wysyłkę zdarzenia z prawdziwego landingu z dozwolonego originu. Dodaj testy end-to-end na swojej instancji PostgreSQL.

## Style interfejsu

Interfejs korzysta z Tailwind CSS 4 przez `@tailwindcss/postcss`. Klasy są zapisane bezpośrednio w komponentach, a `app/style.css` importuje Tailwinda. Paleta: `slate-50` (tło), `slate-900` (nagłówki), `slate-500` (tekst pomocniczy), `#1664d8` (akcje, linki i logo), ten sam kolor z przezroczystością (akcje drugorzędne), `sky-400` (wykres). Wysokości słupków są wyliczane na podstawie danych.
