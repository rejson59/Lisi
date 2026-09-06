# 🛠️ Instalacja Lisi — krok po kroku

Wszystko, czego potrzebujesz, żeby uruchomić Lisi. **Część 1 (laptop)** wystarczy, żeby zacząć. Telefon i Supabase są opcjonalne.

---

## 📋 Co potrzebujesz (wszystko darmowe)

| Co | Po co | Gdzie pobrać |
|----|-------|--------------|
| **Node.js 18+** | Uruchamianie kodu | [nodejs.org](https://nodejs.org) (wersja LTS) |
| **Git** | Pobranie kodu | [git-scm.com](https://git-scm.com) |
| **Gemini API Key** | Darmowe AI | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

Opcjonalnie (później): **Supabase** (sync między urządzeniami), **Expo konto** (build .apk), **Spotify Developer** (sterowanie muzyką).

---

## 🖥️ Część 1: Wersja na laptop

### Krok 1: Pobierz kod

```bash
git clone https://github.com/rejson59/Lisi.git
cd Lisi
```

### Krok 2: Zainstaluj Node.js

1. Wejdź na [nodejs.org](https://nodejs.org), pobierz wersję **LTS**, zainstaluj.
2. Sprawdź w terminalu: `node --version` → powinno pokazać `v18`, `v20` lub nowszy.

### Krok 3: Pobierz darmowy klucz Gemini

1. Wejdź na [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Zaloguj się kontem Google → **"Create API key"**
3. Skopiuj klucz (zaczyna się od `AIza...`)

### Krok 4: Zainstaluj i uruchom

```bash
# w głównym folderze Lisi
npm install
npm run desktop:dev
```

> Pierwsze uruchomienie trwa chwilę (Electron pobiera się przy `npm install`, Vite buduje przy starcie). Otworzy się okno z Lisí i osobne okienko deweloperskie — to normalne w trybie dev.

### Krok 5: Wpisz klucz w aplikacji

1. Kliknij **⚙️** (ustawienia) → zakładka **API**
2. Wklej **Gemini API Key** → **Zapisz**
3. Lisi połączy się automatycznie — mów do mikrofonu lub pisz na czacie ✨

### Krok 6 (opcjonalnie): Zbuduj instalator .exe

```bash
npm run desktop:build
```

Instalator pojawi się w `packages/desktop/release/`. Aby aktualizacje automatyczne działały, wersje trzeba publikować jako **GitHub Releases** tego repo (skonfigurowane w `packages/desktop/electron-builder.yml`).

---

## 📱 Część 2 (opcjonalnie): Wersja na telefon

Aplikacja mobilna jest osobnym projektem (Expo) i ma własne zależności.

### Krok 1: Instalacja

```bash
cd packages/mobile
npm install
cd ../..
```

### Krok 2: Uruchomienie na telefonie (tryb deweloperski)

1. Zainstaluj aplikację **Expo Go** z Google Play
2. W terminalu:

```bash
cd packages/mobile
npx expo start
```

3. Zeskanuj kod QR aparatem telefonu — Lisi otworzy się w Expo Go
4. Wpisz klucz Gemini w ustawieniach aplikacji (⚙️)

### Krok 3: Budowanie .apk (instalacja bez Expo Go)

Potrzebujesz konta Expo ([expo.dev](https://expo.dev), darmowe):

```bash
npm install -g eas-cli
cd packages/mobile
npx eas login
eas build -p android --profile preview
```

Build trwa ~10–15 minut na serwerach Expo. Dostaniesz link do `.apk` — pobierz go na telefon i zainstaluj (w ustawieniach zezwól na "nieznane źródła").

> 💡 **Aktualizacje OTA:** aby działały automatyczne aktualizacje na telefonie, po pierwszym `eas build` podmień w `packages/mobile/app.json` pola `extra.eas.projectId` i `updates.url` na wartości ze swojego projektu Expo (`eas project:info`).

### Krok 4: "Hej Lisi" — jak Asystent Google

Po zainstalowaniu .apk możesz w systemie ustawić Lisi jako domyślnego asystenta: **Ustawienia → Aplikacje → Domyślne aplikacje → Asystent**.

---

## 🗄️ Część 3 (opcjonalnie): Supabase — sync między urządzeniami

Bez Supabase Lisi działa w pełni lokalnie (ustawienia i pamięć w pamięci urządzenia). Jeśli chcesz, żeby laptop i telefon dzieliły ustawienia i wspomnienia:

1. Załóż darmowe konto na [supabase.com](https://supabase.com) → **New Project**
2. W lewym menu otwórz **SQL Editor** → **New Query**
3. Wklej całą zawartość pliku [`supabase/schema.sql`](../supabase/schema.sql) → **Run**
4. W **Settings → API** skopiuj **Project URL** i **anon public key**
5. Wklej oba w ustawieniach Lisi (⚙️ → API) — na laptopie **i** telefonie

---

## 🎨 Personalizacja

Wszystko w ustawieniach aplikacji (⚙️):

- **Osobowość** — edytuj "System Prompt" w zakładce Ogólne (np. *"Jesteś poważną asystentką, mówisz zwięźle"*)
- **Głos** — wybierz jeden z głosów Gemini (Aoede — melodyjny żeński — pasuje do Lisi~)
- **Fraza wybudzania** — domyślnie "Hej Lisi" (telefon)
- **Motyw** — ciemny, jasny lub anime

---

## 🔧 Rozwiązywanie problemów

**`npm install` wywala błąd z `react-native`**
Mobile jest osobnym projektem — zależności mobilne instaluj tylko w `packages/mobile` (`cd packages/mobile && npm install`). Główny folder nie dotyka React Native.

**"Nie mogę uruchomić — brak modułu"**
Usuń `node_modules` i zainstaluj od nowa:
```bash
rm -rf node_modules packages/desktop/dist
npm install
```

**"Błąd połączenia z Gemini"**
- Klucz ma zaczynać się od `AIza` — sprawdź literówki
- Sprawdź na [aistudio.google.com](https://aistudio.google.com), czy klucz jest aktywny

**"Model 3D się nie wyświetla"**
- Model musi być w `packages/desktop/public/models/Lisi.vrm`
- Zajrzyj do konsoli (F12 w oknie Lisi) — tam widać błąd ładowania

**"Budzik nie działa na telefonie"**
Nadaj aplikacji uprawnienia: wyświetlanie nad innymi aplikacjami, działanie w tle, dokładne alarmy (Ustawienia → Aplikacje → Lisi).

**Kontrola ekranu nie klika (Linux)**
Na Linuksie do symulowania myszy/klawiatury potrzebny jest `xdotool` (`sudo apt install xdotool`). Windows i macOS działają od ręki (PowerShell / AppleScript).

---

## 📁 Ważne pliki

| Plik | Co to jest |
|------|-----------|
| `packages/desktop/public/models/Lisi.vrm` | Model 3D Lisi (Twój!) |
| `supabase/schema.sql` | Schemat bazy danych |
| `packages/shared/src/types/index.ts` | Typy + domyślny system prompt Lisi |
| `packages/desktop/electron-builder.yml` | Konfiguracja builda .exe |

Jak wszystko działa od środka → **[ARCHITECTURE.md](./ARCHITECTURE.md)** 🦊
